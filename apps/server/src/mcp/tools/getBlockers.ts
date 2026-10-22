import { z } from "zod";
import { createGitHubProvider } from "../../github/client.js";
import {
  scorePullRequest,
  scoreIssue,
  rankBlockers,
} from "../../scoring/priority.js";
import { bedrockService } from "../../bedrock/client.js";
import { config } from "../../config.js";
import type { Blocker, GetBlockersResult } from "@standup/shared";

export const getBlockersInputSchema = {
  repos: z.array(z.string()).optional().describe("Optional list of repo names in owner/name format"),
  limit: z.number().int().min(1).max(10).default(5).optional().describe("Maximum number of blockers to return (default 5, max 10)"),
  includeSnoozed: z.boolean().default(false).optional().describe("Whether to include snoozed items"),
};

export async function handleGetBlockers(args: {
  repos?: string[];
  limit?: number;
  includeSnoozed?: boolean;
}): Promise<{ data: GetBlockersResult; spoken: string }> {
  const { repos, limit = 5, includeSnoozed = false } = args;
  const { provider, degraded: providerDegraded } = createGitHubProvider();

  // 1. Fetch assigned work
  const { pullRequests, issues } = await provider.listAssignedWork(repos);

  // 2. Score pull requests and issues deterministically
  const candidateBlockers: Blocker[] = [];

  for (const pr of pullRequests) {
    const scored = scorePullRequest(pr, {
      currentUser: config.GITHUB_USER,
      staleReviewHours: config.STALE_REVIEW_HOURS,
      includeSnoozed,
    });
    if (scored) {
      candidateBlockers.push(scored);
    }
  }

  for (const issue of issues) {
    const scored = scoreIssue(issue, {
      currentUser: config.GITHUB_USER,
      includeSnoozed,
    });
    if (scored) {
      candidateBlockers.push(scored);
    }
  }

  // 3. Rank deterministically first
  const deterministicRanked = rankBlockers(candidateBlockers);
  const topCandidates = deterministicRanked.slice(0, limit);

  // 4. Send top candidates to Bedrock for ranking refinement & natural spoken briefing
  const { ranking, generatedBy: rankGenBy, degraded: rankDegraded } =
    await bedrockService.rankBlockers(topCandidates);

  const { briefing, generatedBy: briefGenBy, degraded: briefDegraded } =
    await bedrockService.generateSpokenBriefing(topCandidates, ranking);

  // Re-order topCandidates according to ranking if Bedrock returned custom order
  const rankedMap = new Map(ranking.ranked.map((r) => [r.id, r.rank]));
  const finalBlockers = [...topCandidates].sort((a, b) => {
    const rankA = rankedMap.get(a.id) ?? 999;
    const rankB = rankedMap.get(b.id) ?? 999;
    return rankA - rankB;
  });

  const degradedReasons = [providerDegraded, rankDegraded, briefDegraded]
    .filter(Boolean)
    .join("; ");

  const generatedBy = rankGenBy === "bedrock" && briefGenBy === "bedrock" ? "bedrock" : "fallback";

  const result: GetBlockersResult = {
    blockers: finalBlockers,
    briefing,
    generatedBy,
    degraded: degradedReasons || undefined,
  };

  return {
    data: result,
    spoken: briefing,
  };
}
