import type {
  Blocker,
  PullRequest,
  BedrockRankingResponse,
  BedrockPrSummaryResponse,
} from "@standup/shared";

export function generateFallbackRanking(blockers: Blocker[]): BedrockRankingResponse {
  const ranked = blockers.map((b, idx) => ({
    id: b.id,
    rank: idx + 1,
    whyItMatters: b.reasons[0] || "Active item needing engineering attention",
  }));

  const top = blockers[0];
  const summary = top
    ? `Today's top priority is ${top.title} due to ${top.reasons[0]?.toLowerCase() || "high impact"}.`
    : "You have a clear board today with no critical blockers.";

  return {
    ranked,
    oneLineSummary: summary,
  };
}

export function generateFallbackBriefing(blockers: Blocker[]): string {
  if (blockers.length === 0) {
    return "Good morning! You're completely unblocked today. All your pull requests have clean C-I runs and there are no overdue issues or stale reviews waiting on you.";
  }

  const top = blockers[0];
  const second = blockers[1];
  const third = blockers[2];

  let spoken = `Good morning! You have ${blockers.length} key items today. First, ${top.type === "pr" ? "pull request" : "issue"} ${top.number}, ${top.title}, needs attention because ${top.reasons[0]?.toLowerCase() || "it is your top blocker"}.`;

  if (second) {
    spoken += ` Also, ${second.type === "pr" ? "pull request" : "issue"} ${second.number} has ${second.reasons[0]?.toLowerCase() || "pending reviews"}.`;
  }

  if (third && blockers.length > 2) {
    spoken += ` In addition, ${third.title} is waiting.`;
  }

  // Suggest intelligent next action
  const staleReview = blockers.find(
    (b) => b.waitingOn.length > 0 && !b.waitingOn.includes("You")
  );
  const snoozeCandidate = blockers.find((b) => b.type === "issue");

  if (staleReview) {
    const reviewer = staleReview.waitingOn[0]?.replace(/^@/, "") || "the reviewer";
    spoken += ` Would you like me to nudge ${reviewer} on pull request ${staleReview.number}?`;
  } else if (snoozeCandidate) {
    spoken += ` Would you like to snooze issue ${snoozeCandidate.number} until tomorrow?`;
  } else {
    spoken += ` How would you like to proceed?`;
  }

  return spoken;
}

export function generateFallbackPrSummary(pr: PullRequest): BedrockPrSummaryResponse {
  const fileCount = pr.filesChanged.length;
  const totalAdditions = pr.filesChanged.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = pr.filesChanged.reduce((sum, f) => sum + f.deletions, 0);

  let risk: "low" | "medium" | "high" = "low";
  if (pr.hasConflicts || pr.ciStatus === "failure" || totalAdditions > 300) {
    risk = "high";
  } else if (totalAdditions > 100 || pr.reviewDecision === "CHANGES_REQUESTED") {
    risk = "medium";
  }

  const blockingFactors: string[] = [];
  if (pr.ciStatus === "failure") blockingFactors.push("Failing CI test suite");
  if (pr.hasConflicts) blockingFactors.push("Merge conflicts with main branch");
  if (pr.reviewDecision === "CHANGES_REQUESTED") blockingFactors.push("Reviewer requested changes");
  if (pr.requestedReviewers.length > 0 && pr.reviewDecision === "REVIEW_REQUIRED") {
    blockingFactors.push(`Awaiting review from ${pr.requestedReviewers.join(", ")}`);
  }
  if (blockingFactors.length === 0) {
    blockingFactors.push("No blockers detected; pull request is ready to merge");
  }

  let suggestedNextStep = "Monitor automated checks and merge once approved.";
  if (pr.hasConflicts) {
    suggestedNextStep = "Rebase on main and resolve git conflicts locally.";
  } else if (pr.ciStatus === "failure") {
    suggestedNextStep = "Inspect failing integration test logs and push a fix.";
  } else if (pr.requestedReviewers.length > 0) {
    suggestedNextStep = `Send a friendly reminder to ${pr.requestedReviewers[0]}.`;
  }

  const spoken = `Pull request ${pr.number}, ${pr.title}, touches ${fileCount} files with plus ${totalAdditions} and minus ${totalDeletions} lines. Risk level is ${risk}. ${blockingFactors[0]}. Recommended next step: ${suggestedNextStep}`;

  return {
    summary: `Pull request #${pr.number} modifies ${fileCount} files (+${totalAdditions}, -${totalDeletions}). Addresses ${pr.title}.`,
    risk,
    blockingFactors,
    suggestedNextStep,
    spoken,
  };
}

export function generateFallbackNudge(
  reviewer: string,
  prNumber: number,
  title: string,
  tone: "friendly" | "firm" | "urgent" = "friendly"
): string {
  const cleanReviewer = reviewer.replace(/^@/, "");
  if (tone === "urgent") {
    return `Hi @${cleanReviewer}, pull request #${prNumber} ("${title}") is blocking our release train. Could you please give it an urgent review today? Thanks!`;
  }
  if (tone === "firm") {
    return `Hi @${cleanReviewer}, following up on pull request #${prNumber} ("${title}"). We need your approval to proceed with deployment.`;
  }
  return `Hi @${cleanReviewer}, when you have a moment, could you please take a look at PR #${prNumber} ("${title}")? Appreciate your feedback!`;
}
