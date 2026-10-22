import { z } from "zod";
import { parseNaturalDate } from "../../scoring/dateParser.js";
import { localState } from "../../store/localState.js";
import { createGitHubProvider } from "../../github/client.js";
import { config } from "../../config.js";
import type { SnoozeIssueResult } from "@standup/shared";

export const snoozeIssueInputSchema = {
  repo: z.string().describe("Repository name in owner/name format, e.g. acme/payments-platform"),
  issueNumber: z.number().int().describe("Issue number to snooze, e.g. 42"),
  until: z.string().describe("When to snooze until: e.g. 'friday', 'tomorrow', 'next week', or ISO date"),
  confirm: z.boolean().default(false).optional().describe("Set to true to confirm and execute the snooze"),
  confirmationId: z.string().optional().describe("ID of the pending confirmation token"),
};

export async function handleSnoozeIssue(args: {
  repo: string;
  issueNumber: number;
  until: string;
  confirm?: boolean;
  confirmationId?: string;
}): Promise<{ data: SnoozeIssueResult; spoken: string }> {
  const { repo, issueNumber, until, confirm = false, confirmationId } = args;
  const { provider, degraded } = createGitHubProvider();

  const targetDate = parseNaturalDate(until);
  const untilIso = targetDate.toISOString();
  const humanDate = targetDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Phase 1: Request confirmation
  if (!confirm) {
    const draftMessage = `Snooze issue #${issueNumber} until ${humanDate} at 9:00 AM`;
    const target = `Issue #${issueNumber} in ${repo}`;

    const pending = localState.createConfirmation(
      "snooze_issue",
      target,
      { repo, issueNumber, untilIso },
      draftMessage
    );

    const spoken = `I'll snooze issue ${issueNumber} until ${humanDate}. It will be excluded from your daily briefings until then. Should I confirm this?`;

    const result: SnoozeIssueResult = {
      status: "needs_confirmation",
      confirmationId: pending.id,
      preview: {
        action: "snooze_issue",
        target,
        draftMessage,
      },
      until: untilIso,
      spoken,
    };

    return { data: result, spoken };
  }

  // Phase 2: Execute confirmed snooze
  if (confirmationId) {
    const pending = localState.consumeConfirmation(confirmationId);
    if (!pending) {
      throw new Error(
        `Confirmation token ${confirmationId} has expired or does not exist. Please request the snooze again.`
      );
    }
  }

  // Persist snooze in local state
  localState.snoozeIssue(repo, issueNumber, untilIso);

  // If live and writes enabled, post comment + label
  let simulated = true;
  if (config.DATA_MODE === "live" && config.LIVE_WRITES) {
    await provider.addLabelAndComment(
      repo,
      issueNumber,
      "snoozed",
      `Issue snoozed by Standup Chief of Staff until ${untilIso}.`
    );
    simulated = false;
  }

  const spoken = `Issue ${issueNumber} is now snoozed until ${humanDate}. It won't appear in your daily briefing until then.`;

  const result: SnoozeIssueResult = {
    status: "snoozed",
    confirmationId,
    simulated,
    until: untilIso,
    spoken,
    degraded,
  };

  return { data: result, spoken };
}
