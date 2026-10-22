import { z } from "zod";
import { createGitHubProvider } from "../../github/client.js";
import { bedrockService } from "../../bedrock/client.js";
import type { SummarizePrResult } from "@standup/shared";

export const summarizePrInputSchema = {
  repo: z.string().describe("Repository name in owner/name format, e.g. acme/payments-platform"),
  number: z.number().int().describe("Pull request number, e.g. 128"),
};

export async function handleSummarizePr(args: {
  repo: string;
  number: number;
}): Promise<{ data: SummarizePrResult; spoken: string }> {
  const { repo, number } = args;
  const { provider, degraded: providerDegraded } = createGitHubProvider();

  const pr = await provider.getPullRequest(repo, number);
  if (!pr) {
    throw new Error(`Pull request #${number} in repository ${repo} was not found.`);
  }

  const { summary: bedrockSummary, generatedBy, degraded: bedrockDegraded } =
    await bedrockService.summarizePr(pr);

  const degraded = [providerDegraded, bedrockDegraded].filter(Boolean).join("; ");

  const result: SummarizePrResult = {
    pr,
    summary: bedrockSummary.summary,
    risk: bedrockSummary.risk,
    blockingFactors: bedrockSummary.blockingFactors,
    suggestedNextStep: bedrockSummary.suggestedNextStep,
    spoken: bedrockSummary.spoken,
    generatedBy,
    degraded: degraded || undefined,
  };

  return {
    data: result,
    spoken: bedrockSummary.spoken,
  };
}
