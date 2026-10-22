import type { Blocker, PullRequest, Issue, BlockerType } from "@standup/shared";
import { localState } from "../store/localState.js";

export interface ScoreItemOptions {
  currentUser: string;
  staleReviewHours?: number;
  includeSnoozed?: boolean;
}

export function scorePullRequest(
  pr: PullRequest,
  options: ScoreItemOptions
): Blocker | null {
  const { currentUser, staleReviewHours = 24, includeSnoozed = false } = options;

  if (!includeSnoozed && localState.isIssueSnoozed(pr.repo, pr.number)) {
    return null;
  }

  let score = 0;
  const reasons: string[] = [];
  const waitingOn: string[] = [];

  const isAuthor = pr.author.toLowerCase() === currentUser.toLowerCase();
  const isReviewRequestedFromMe = pr.requestedReviewers.some(
    (r) => r.toLowerCase() === currentUser.toLowerCase()
  );

  const createdAt = new Date(pr.createdAt).getTime();
  const ageHours = Math.max(0, Math.round((Date.now() - createdAt) / (1000 * 60 * 60)));

  let type: BlockerType = "pr";
  if (!isAuthor && isReviewRequestedFromMe) {
    type = "review_request";
  }

  // 1. CI failing (+30)
  if (pr.ciStatus === "failure") {
    score += 30;
    reasons.push("CI build is failing on this PR");
  }

  // 2. Review requested from me and stale > STALE_REVIEW_HOURS (+25, scaled by age)
  if (isReviewRequestedFromMe && !isAuthor) {
    if (ageHours >= staleReviewHours) {
      // Scale: +25 base, plus up to +10 for age (e.g. 48h = +29, 72h = +35)
      const ageBonus = Math.min(10, Math.floor((ageHours - staleReviewHours) / 12) * 2);
      const staleScore = 25 + ageBonus;
      score += staleScore;
      reasons.push(`Review requested from you is stale (${ageHours}h old, threshold ${staleReviewHours}h)`);
      waitingOn.push("You (review required)");
    } else {
      reasons.push(`Review requested from you (${ageHours}h ago)`);
      waitingOn.push("You (review required)");
    }
  }

  // 3. My PR blocked by changes requested (+25)
  if (isAuthor && pr.reviewDecision === "CHANGES_REQUESTED") {
    score += 25;
    reasons.push("Changes requested by reviewer");
    waitingOn.push("You (address feedback)");
  }

  // 4. My PR waiting on reviews
  if (isAuthor && pr.reviewDecision === "REVIEW_REQUIRED") {
    if (pr.requestedReviewers.length > 0) {
      for (const rev of pr.requestedReviewers) {
        waitingOn.push(rev);
      }
      if (ageHours >= staleReviewHours) {
        score += 25;
        reasons.push(`Stale review waiting on ${pr.requestedReviewers.join(", ")} for ${ageHours}h`);
      } else {
        score += 15;
        reasons.push(`Awaiting review from ${pr.requestedReviewers.join(", ")}`);
      }
    }
  }

  // 5. My PR approved but unmerged (+10)
  if (isAuthor && pr.reviewDecision === "APPROVED") {
    score += 10;
    reasons.push("PR is approved and ready to merge");
  }

  // 6. Merge conflicts (+15)
  if (pr.hasConflicts) {
    score += 15;
    reasons.push("Merge conflicts with main branch");
  }

  // 7. PR labeled blocker/P0/P1/security (+20/+25)
  const lowerLabels = pr.labels.map((l) => l.toLowerCase());
  if (lowerLabels.includes("p0") || lowerLabels.includes("blocker")) {
    score += 25;
    reasons.push("High priority blocker (P0)");
  } else if (lowerLabels.includes("p1") || lowerLabels.includes("security")) {
    score += 20;
    reasons.push("High priority security item");
  }

  // Bound score between 0 and 100
  const priorityScore = Math.min(100, Math.max(0, score));

  return {
    id: pr.id,
    type,
    repo: pr.repo,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    priorityScore,
    reasons: reasons.length > 0 ? reasons : ["Active pull request"],
    waitingOn: Array.from(new Set(waitingOn)),
    ageHours,
    ciStatus: pr.ciStatus,
  };
}

export function scoreIssue(
  issue: Issue,
  options: ScoreItemOptions
): Blocker | null {
  const { currentUser, includeSnoozed = false } = options;

  if (!includeSnoozed && localState.isIssueSnoozed(issue.repo, issue.number)) {
    return null;
  }

  let score = 0;
  const reasons: string[] = [];
  const waitingOn: string[] = [];

  const isAssignedToMe = issue.assignees.some(
    (a) => a.toLowerCase() === currentUser.toLowerCase()
  );

  const createdAt = new Date(issue.createdAt).getTime();
  const ageHours = Math.max(0, Math.round((Date.now() - createdAt) / (1000 * 60 * 60)));

  const lowerLabels = issue.labels.map((l) => l.toLowerCase());
  const isP0 = lowerLabels.includes("p0") || lowerLabels.includes("blocker");
  const isP1 = lowerLabels.includes("p1") || lowerLabels.includes("critical");

  // 1. Issue labeled blocker/P0/P1 (+20 for P1, +25 for P0/blocker)
  if (isP0) {
    score += 25;
    reasons.push("High priority blocker (P0)");
  } else if (isP1) {
    score += 20;
    reasons.push("Urgent priority issue (P1)");
  }

  // 2. Assigned to me and overdue (+15)
  if (isAssignedToMe && issue.isOverdue) {
    score += 15;
    reasons.push("Assigned to you and overdue");
    waitingOn.push("You (overdue resolution)");
  } else if (isAssignedToMe) {
    score += 10;
    reasons.push("Assigned to you");
    waitingOn.push("You");
  }

  // 3. Someone is blocked waiting on me (+20)
  if (issue.blockedWaitingOnMe) {
    score += 20;
    reasons.push("Teammates blocked waiting on your resolution");
    if (!waitingOn.includes("You")) {
      waitingOn.push("You");
    }
  }

  const priorityScore = Math.min(100, Math.max(0, score));

  return {
    id: issue.id,
    type: "issue",
    repo: issue.repo,
    number: issue.number,
    title: issue.title,
    url: issue.url,
    priorityScore,
    reasons: reasons.length > 0 ? reasons : ["Assigned open issue"],
    waitingOn: Array.from(new Set(waitingOn)),
    ageHours,
    ciStatus: "unknown",
  };
}

export function rankBlockers(blockers: Blocker[]): Blocker[] {
  return [...blockers].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    // secondary: age
    return b.ageHours - a.ageHours;
  });
}
