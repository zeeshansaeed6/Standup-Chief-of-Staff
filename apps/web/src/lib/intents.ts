import type { Blocker } from "@standup/shared";

export type IntentType =
  | "get_blockers"
  | "summarize_pr"
  | "nudge_reviewer"
  | "snooze_issue"
  | "confirm"
  | "cancel"
  | "unknown";

export interface ParsedIntent {
  type: IntentType;
  args?: Record<string, any>;
  clarification?: string;
  originalUtterance: string;
}

export interface SessionContext {
  lastBlockers?: Blocker[];
  lastSelectedPr?: { repo: string; number: number };
  pendingConfirmation?: {
    id: string;
    action: "nudge_reviewer" | "snooze_issue";
    payload: Record<string, any>;
  };
}

export function cleanUtterance(text: string, requireWakeWord: boolean = false): string {
  let cleaned = text.trim();
  // Strip wake word if present
  if (/^alexa\b[,:\s]*/i.test(cleaned)) {
    cleaned = cleaned.replace(/^alexa\b[,:\s]*/i, "").trim();
  } else if (requireWakeWord) {
    // If wake word is required but not found
    return "";
  }
  return cleaned;
}

export function parseIntent(
  rawUtterance: string,
  context: SessionContext = {},
  requireWakeWord: boolean = false
): ParsedIntent {
  const utterance = cleanUtterance(rawUtterance, requireWakeWord);
  if (!utterance && requireWakeWord) {
    return {
      type: "unknown",
      clarification: "Please say 'Alexa' first, like 'Alexa, what's blocking me today?'",
      originalUtterance: rawUtterance,
    };
  }

  const lower = utterance.toLowerCase();

  // 1. Confirmations
  if (/^(yes|yeah|yep|send it|confirm|go ahead|do it|sure|sounds good|proceed)\b/i.test(lower)) {
    return {
      type: "confirm",
      originalUtterance: rawUtterance,
    };
  }

  // 2. Cancellations
  if (/^(no|nope|cancel|never mind|stop|don't send|abort)\b/i.test(lower)) {
    return {
      type: "cancel",
      originalUtterance: rawUtterance,
    };
  }

  // 3. Get Blockers
  if (
    /block(ing|er|ers)?/i.test(lower) ||
    /standup|briefing|morning update|what should i do/i.test(lower)
  ) {
    return {
      type: "get_blockers",
      args: { limit: 5 },
      originalUtterance: rawUtterance,
    };
  }

  // 4. Summarize PR
  if (/summar(y|ize)|tell me about|inspect|what is/i.test(lower) && /pr|pull request|auth/i.test(lower)) {
    // Extract PR number
    const numMatch = lower.match(/(?:pr|pull request|#)\s*#?(\d+)/i) || lower.match(/\b(\d+)\b/);
    let prNumber: number | undefined = numMatch ? parseInt(numMatch[1], 10) : undefined;
    let repo = "acme/payments-platform";

    // Loose title match if no number, e.g. "the auth PR"
    if (!prNumber && context.lastBlockers) {
      if (lower.includes("auth")) {
        const authItem = context.lastBlockers.find((b) =>
          b.title.toLowerCase().includes("auth")
        );
        if (authItem) {
          prNumber = authItem.number;
          repo = authItem.repo;
        }
      }
    }

    if (prNumber) {
      return {
        type: "summarize_pr",
        args: { repo, number: prNumber },
        originalUtterance: rawUtterance,
      };
    }
  }

  // 5. Nudge Reviewer
  if (/nudge|ping|remind|poke/i.test(lower)) {
    // Extract reviewer name
    let reviewer = "Priya";
    if (/priya/i.test(lower)) reviewer = "Priya Sharma";
    else if (/marcus/i.test(lower)) reviewer = "Marcus Lee";
    else if (/sofia/i.test(lower)) reviewer = "Sofia Alvarez";
    else if (/dev\b/i.test(lower)) reviewer = "Dev Patel";

    // Extract PR number
    const numMatch = lower.match(/(?:pr|pull request|#|on)\s*#?(\d+)/i) || lower.match(/\b(\d+)\b/);
    let prNumber = numMatch ? parseInt(numMatch[1], 10) : undefined;
    let repo = "acme/payments-platform";

    if (!prNumber && context.lastSelectedPr) {
      prNumber = context.lastSelectedPr.number;
      repo = context.lastSelectedPr.repo;
    } else if (!prNumber && context.lastBlockers) {
      // Find a PR in blockers waiting on this reviewer
      const match = context.lastBlockers.find(
        (b) =>
          b.type === "pr" &&
          b.waitingOn.some((w) => w.toLowerCase().includes(reviewer.toLowerCase().split(" ")[0]))
      );
      if (match) {
        prNumber = match.number;
        repo = match.repo;
      } else {
        // Default to PR 128 as in demo
        prNumber = 128;
      }
    } else if (!prNumber) {
      prNumber = 128;
    }

    return {
      type: "nudge_reviewer",
      args: { repo, number: prNumber, reviewer, confirm: false },
      originalUtterance: rawUtterance,
    };
  }

  // 6. Snooze Issue
  if (/snooze|defer|postpone/i.test(lower)) {
    // Extract issue number
    const numMatch = lower.match(/(?:issue|#)\s*#?(\d+)/i) || lower.match(/\b(\d+)\b/);
    const issueNumber = numMatch ? parseInt(numMatch[1], 10) : 42;

    // Extract until phrase
    let until = "friday";
    if (/tomorrow/i.test(lower)) until = "tomorrow";
    else if (/next week/i.test(lower)) until = "next week";
    else if (/friday/i.test(lower)) until = "friday";
    else if (/monday/i.test(lower)) until = "monday";
    else {
      const untilMatch = lower.match(/until\s+([a-z0-9\-]+)/i);
      if (untilMatch) until = untilMatch[1];
    }

    return {
      type: "snooze_issue",
      args: { repo: "acme/payments-platform", issueNumber, until, confirm: false },
      originalUtterance: rawUtterance,
    };
  }

  // Fallback / Unknown
  return {
    type: "unknown",
    clarification:
      "I didn't quite get that. Try asking 'What's blocking me today?', 'Summarize PR 128', 'Nudge Priya', or 'Snooze issue 42 until Friday'.",
    originalUtterance: rawUtterance,
  };
}
