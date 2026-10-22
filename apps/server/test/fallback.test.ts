import { describe, it, expect } from "vitest";
import {
  generateFallbackBriefing,
  generateFallbackRanking,
  generateFallbackPrSummary,
  generateFallbackNudge,
} from "../src/bedrock/fallback.js";
import type { Blocker, PullRequest } from "@standup/shared";

describe("Deterministic Fallback Generators", () => {
  const sampleBlockers: Blocker[] = [
    {
      id: "pr_128",
      type: "pr",
      repo: "acme/payments-platform",
      number: 128,
      title: "Refactor auth token refresh",
      url: "https://github.com/acme/payments-platform/pull/128",
      priorityScore: 75,
      reasons: ["Stale review waiting on Priya Sharma for 28 hours"],
      waitingOn: ["Priya Sharma"],
      ageHours: 28,
      ciStatus: "success",
    },
    {
      id: "issue_42",
      type: "issue",
      repo: "acme/payments-platform",
      number: 42,
      title: "Webhook retry exponential backoff failing in production",
      url: "https://github.com/acme/payments-platform/issues/42",
      priorityScore: 65,
      reasons: ["High priority blocker (P0)"],
      waitingOn: ["You"],
      ageHours: 14,
      ciStatus: "unknown",
    },
  ];

  it("generates natural spoken briefing under 90 words with no markdown", () => {
    const briefing = generateFallbackBriefing(sampleBlockers);
    expect(briefing).toBeDefined();
    // No markdown or urls
    expect(briefing).not.toMatch(/[*#`_\[\]]/);
    expect(briefing).not.toMatch(/https?:\/\//);
    // Word count under 90
    const wordCount = briefing.split(/\s+/).length;
    expect(wordCount).toBeLessThan(90);
    // Mention top item and next action offer
    expect(briefing).toContain("128");
    expect(briefing.toLowerCase()).toContain("nudge");
  });

  it("handles empty blockers board gracefully", () => {
    const briefing = generateFallbackBriefing([]);
    expect(briefing).toContain("unblocked");
  });

  it("generates fallback ranking with one line summary", () => {
    const ranking = generateFallbackRanking(sampleBlockers);
    expect(ranking.ranked.length).toBe(2);
    expect(ranking.ranked[0].rank).toBe(1);
    expect(ranking.oneLineSummary).toContain("Refactor auth token refresh");
  });

  it("generates PR summary with risk rating and blocking factors", () => {
    const pr: PullRequest = {
      id: "pr_104",
      repo: "acme/payments-platform",
      number: 104,
      title: "Migrate Stripe webhook handlers to V3",
      url: "https://github.com/acme/payments-platform/pull/104",
      author: "alex-dev",
      assignees: ["alex-dev"],
      requestedReviewers: ["marcus-lee"],
      reviewDecision: "CHANGES_REQUESTED",
      ciStatus: "failure",
      hasConflicts: true,
      labels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      filesChanged: [
        { path: "src/webhooks/stripeHandler.ts", additions: 230, deletions: 180 },
      ],
      commentsCount: 2,
      recentComments: [],
    };

    const summary = generateFallbackPrSummary(pr);
    expect(summary.risk).toBe("high"); // failing CI + conflicts + large changes
    expect(summary.blockingFactors.some((b) => b.includes("CI"))).toBe(true);
    expect(summary.blockingFactors.some((b) => b.includes("conflict"))).toBe(true);
    expect(summary.suggestedNextStep).toBeDefined();
    expect(summary.spoken).not.toMatch(/[*#`]/);
  });

  it("generates polite, formatted nudge messages in all tones", () => {
    const friendly = generateFallbackNudge("Priya Sharma", 128, "Refactor auth token refresh", "friendly");
    expect(friendly).toContain("@Priya Sharma");
    expect(friendly).toContain("128");

    const urgent = generateFallbackNudge("Priya", 128, "Refactor auth token refresh", "urgent");
    expect(urgent).toContain("urgent");

    const firm = generateFallbackNudge("Priya", 128, "Refactor auth token refresh", "firm");
    expect(firm).toContain("approval");
  });
});
