import { z } from "zod";
import { createGitHubProvider } from "../../github/client.js";
import { bedrockService } from "../../bedrock/client.js";
import { localState } from "../../store/localState.js";
import { config } from "../../config.js";
import type { NudgeReviewerResult } from "@standup/shared";

export const nudgeReviewerInputSchema = {
  repo: z.string().describe("Repository name in owner/name format, e.g. acme/payments-platform"),
  number: z.number().int().describe("Pull request number, e.g. 128"),
  reviewer: z.string().describe("Username or name of the reviewer to nudge, e.g. Priya Sharma or priya-sharma"),
  tone: z.enum(["friendly", "firm", "urgent"]).default("friendly").optional().describe("Tone of the reminder"),
  confirm: z.boolean().default(false).optional().describe("Set to true to execute after previewing"),
  confirmationId: z.string().optional().describe("ID of the pending confirmation token"),
};

export async function handleNudgeReviewer(args: {
  repo: string;
  number: number;
  reviewer: string;
  tone?: "friendly" | "firm" | "urgent";
  confirm?: boolean;
  confirmationId?: string;
}): Promise<{ data: NudgeReviewerResult; spoken: string }> {
  const { repo, number, reviewer, tone = "friendly", confirm = false, confirmationId } = args;
  const { provider, degraded } = createGitHubProvider();

  const cleanReviewer = reviewer.replace(/^@/, "").trim();

  // Phase 1: Preview & Confirmation Request
  if (!confirm) {
    const pr = await provider.getPullRequest(repo, number);
    const title = pr ? pr.title : `Pull Request #${number}`;

    const draftMessage = await bedrockService.draftNudge(cleanReviewer, number, title, tone);
    const target = `@${cleanReviewer} on ${repo}#${number}`;

    const pending = localState.createConfirmation(
      "nudge_reviewer",
      target,
      { repo, number, reviewer: cleanReviewer, tone, draftMessage },
      draftMessage
    );

    const spoken = `I'll nudge ${cleanReviewer} on pull request ${number} with this message: "${draftMessage}". Should I send it?`;

    const result: NudgeReviewerResult = {
      status: "needs_confirmation",
      confirmationId: pending.id,
      preview: {
        action: "nudge_reviewer",
        target,
        draftMessage,
      },
      spoken,
    };

    return { data: result, spoken };
  }

  // Phase 2: Execute confirmed action
  let draftToSend = `Hi @${cleanReviewer}, gentle reminder to review pull request #${number}. Thanks!`;

  if (confirmationId) {
    const pending = localState.consumeConfirmation(confirmationId);
    if (!pending) {
      throw new Error(
        `Confirmation token ${confirmationId} has expired or does not exist. Please request the nudge again.`
      );
    }
    draftToSend = pending.draftMessage || draftToSend;
  }

  const commentResult = await provider.commentOnPullRequest(repo, number, draftToSend);
  const simulated = commentResult.simulated ?? !config.LIVE_WRITES;

  localState.recordNudge({
    confirmationId,
    repo,
    number,
    reviewer: cleanReviewer,
    tone,
    draftMessage: draftToSend,
    timestamp: new Date().toISOString(),
    simulated,
    confirmed: true,
  });

  const spoken = simulated
    ? `I've simulated the nudge to ${cleanReviewer} on pull request ${number}. In live mode, this would post a comment.`
    : `I've posted the reminder to ${cleanReviewer} on pull request ${number}.`;

  const result: NudgeReviewerResult = {
    status: "sent",
    confirmationId,
    simulated,
    spoken,
    degraded,
  };

  return { data: result, spoken };
}
