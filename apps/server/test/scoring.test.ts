import { describe, it, expect, beforeEach } from "vitest";
import {
  scorePullRequest,
  scoreIssue,
  rankBlockers,
} from "../src/scoring/priority.js";
import { localState } from "../src/store/localState.js";
import type { PullRequest, Issue } from "@standup/shared";

describe("Deterministic Priority Scoring", () => {
  beforeEach(() => {
    localState.clear();
  });

  const basePr: PullRequest = {
    id: "pr_test",
    repo: "acme/payments-platform",
    number: 100,
    title: "Test PR",
    url: "https://github.com/acme/payments-platform/pull/100",
    author: "alex-dev",
    assignees: ["alex-dev"],
    requestedReviewers: [],
    reviewDecision: "NONE",
    ciStatus: "success",
    hasConflicts: false,
    labels: [],
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    filesChanged: [],
    commentsCount: 0,
    recentComments: [],
  };

  it("adds +30 score when CI build fails", () => {
    const pr: PullRequest = { ...basePr, ciStatus: "failure" };
    const scored = scorePullRequest(pr, { currentUser: "alex-dev" });
    expect(scored).not.toBeNull();
    expect(scored?.priorityScore).toBe(30);
    expect(scored?.reasons).toContain("CI build is failing on this PR");
  });

  it("adds +15 score for merge conflicts", () => {
    const pr: PullRequest = { ...basePr, hasConflicts: true };
    const scored = scorePullRequest(pr, { currentUser: "alex-dev" });
    expect(scored?.priorityScore).toBe(15);
    expect(scored?.reasons).toContain("Merge conflicts with main branch");
  });

  it("adds +25 score when author's PR has changes requested", () => {
    const pr: PullRequest = { ...basePr, reviewDecision: "CHANGES_REQUESTED" };
    const scored = scorePullRequest(pr, { currentUser: "alex-dev" });
    expect(scored?.priorityScore).toBe(25);
    expect(scored?.reasons).toContain("Changes requested by reviewer");
  });

  it("scores stale review requests requested from currentUser (> 24 hours)", () => {
    const pr: PullRequest = {
      ...basePr,
      author: "marcus-lee",
      requestedReviewers: ["alex-dev"],
      reviewDecision: "REVIEW_REQUIRED",
      createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), // 72 hours ago
    };
    const scored = scorePullRequest(pr, {
      currentUser: "alex-dev",
      staleReviewHours: 24,
    });
    expect(scored?.type).toBe("review_request");
    expect(scored?.priorityScore).toBeGreaterThanOrEqual(25);
    expect(scored?.reasons.some((r) => r.includes("stale"))).toBe(true);
  });

  it("scores P0 issue (+25) and waiting on me (+20)", () => {
    const issue: Issue = {
      id: "issue_test",
      repo: "acme/payments-platform",
      number: 42,
      title: "Production crash",
      url: "https://github.com/acme/payments-platform/issues/42",
      author: "priya-sharma",
      assignees: ["alex-dev"],
      labels: ["bug", "P0", "blocker"],
      createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      isOverdue: false,
      blockedWaitingOnMe: true,
    };
    const scored = scoreIssue(issue, { currentUser: "alex-dev" });
    expect(scored?.priorityScore).toBe(25 + 10 + 20); // P0 (25) + assigned (10) + blockedWaitingOnMe (20) = 55
  });

  it("excludes snoozed issues until expiration", () => {
    const issue: Issue = {
      id: "issue_42",
      repo: "acme/payments-platform",
      number: 42,
      title: "Production crash",
      url: "https://github.com/acme/payments-platform/issues/42",
      author: "priya-sharma",
      assignees: ["alex-dev"],
      labels: ["P0"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOverdue: false,
    };

    // Before snooze
    let scored = scoreIssue(issue, { currentUser: "alex-dev" });
    expect(scored).not.toBeNull();

    // Snooze until tomorrow
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    localState.snoozeIssue("acme/payments-platform", 42, tomorrow);

    // After snooze
    scored = scoreIssue(issue, { currentUser: "alex-dev" });
    expect(scored).toBeNull();

    // Include snoozed override
    scored = scoreIssue(issue, { currentUser: "alex-dev", includeSnoozed: true });
    expect(scored).not.toBeNull();
  });

  it("correctly ranks multiple blockers descending by score", () => {
    const b1 = { priorityScore: 20, ageHours: 5 } as any;
    const b2 = { priorityScore: 55, ageHours: 2 } as any;
    const b3 = { priorityScore: 30, ageHours: 10 } as any;

    const ranked = rankBlockers([b1, b2, b3]);
    expect(ranked[0].priorityScore).toBe(55);
    expect(ranked[1].priorityScore).toBe(30);
    expect(ranked[2].priorityScore).toBe(20);
  });
});
