import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { config } from "../config.js";
import {
  RANKING_SYSTEM_PROMPT,
  BRIEFING_SYSTEM_PROMPT,
  PR_SUMMARY_SYSTEM_PROMPT,
  NUDGE_SYSTEM_PROMPT,
} from "./prompts.js";
import {
  generateFallbackRanking,
  generateFallbackBriefing,
  generateFallbackPrSummary,
  generateFallbackNudge,
} from "./fallback.js";
import {
  BedrockRankingResponseSchema,
  BedrockPrSummaryResponseSchema,
  type Blocker,
  type PullRequest,
  type BedrockRankingResponse,
  type BedrockPrSummaryResponse,
} from "@standup/shared";

export function cleanJsonString(input: string): string {
  let cleaned = input.trim();
  // Strip markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

export class BedrockAssistantService {
  private client: BedrockRuntimeClient | null = null;
  private mode: "mock" | "live";
  private timeoutMs = 8000;

  constructor() {
    this.mode = config.BEDROCK_MODE;
    if (this.mode === "live") {
      try {
        const clientConfig: any = {
          region: config.AWS_REGION,
          maxAttempts: 1,
        };
        if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
          clientConfig.credentials = {
            accessKeyId: config.AWS_ACCESS_KEY_ID,
            secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            sessionToken: config.AWS_SESSION_TOKEN || undefined,
          };
        }
        this.client = new BedrockRuntimeClient(clientConfig);
      } catch (err) {
        console.warn("⚠️ Failed to initialize Bedrock client, falling back to mock mode:", err);
        this.client = null;
      }
    }
  }

  private async callConverse(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Bedrock client is not initialized");
    }

    const command = new ConverseCommand({
      modelId: config.BEDROCK_MODEL_ID,
      messages: [
        {
          role: "user",
          content: [{ text: userPrompt }],
        },
      ],
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        temperature: 0.2,
        maxTokens: 800,
      },
    });

    const response = await Promise.race([
      this.client.send(command),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Bedrock request timed out (8s limit)")), this.timeoutMs)
      ),
    ]);

    const text = response.output?.message?.content?.[0]?.text;
    if (!text) {
      throw new Error("Empty response content from Bedrock");
    }
    return text;
  }

  // --- Task A: Ranking & Grouping ---
  public async rankBlockers(
    blockers: Blocker[]
  ): Promise<{
    ranking: BedrockRankingResponse;
    generatedBy: "bedrock" | "fallback";
    degraded?: string;
  }> {
    if (this.mode !== "live" || !this.client) {
      return {
        ranking: generateFallbackRanking(blockers),
        generatedBy: "fallback",
      };
    }

    const userPayload = JSON.stringify(
      blockers.map((b) => ({
        id: b.id,
        type: b.type,
        repo: b.repo,
        number: b.number,
        title: b.title,
        priorityScore: b.priorityScore,
        reasons: b.reasons,
        waitingOn: b.waitingOn,
        ageHours: b.ageHours,
        ciStatus: b.ciStatus,
      })),
      null,
      2
    );

    try {
      const rawText = await this.callConverse(RANKING_SYSTEM_PROMPT, userPayload);
      const cleaned = cleanJsonString(rawText);
      try {
        const parsed = JSON.parse(cleaned);
        const validated = BedrockRankingResponseSchema.parse(parsed);
        return { ranking: validated, generatedBy: "bedrock" };
      } catch (parseErr) {
        console.warn("Bedrock ranking JSON validation failed, retrying with repair prompt...");
        const repairPrompt = `The previous JSON response was invalid. Reformat this strictly into the required JSON schema with no other text:\n${cleaned}`;
        const repairedRaw = await this.callConverse(RANKING_SYSTEM_PROMPT, repairPrompt);
        const repairedClean = cleanJsonString(repairedRaw);
        const repairedParsed = JSON.parse(repairedClean);
        const validated = BedrockRankingResponseSchema.parse(repairedParsed);
        return { ranking: validated, generatedBy: "bedrock" };
      }
    } catch (err: any) {
      console.warn("⚠️ Bedrock ranking call failed, falling back to deterministic template:", err.message);
      return {
        ranking: generateFallbackRanking(blockers),
        generatedBy: "fallback",
        degraded: `Bedrock ranking error: ${err.message}`,
      };
    }
  }

  // --- Task B: Spoken Briefing ---
  public async generateSpokenBriefing(
    blockers: Blocker[],
    ranking: BedrockRankingResponse
  ): Promise<{
    briefing: string;
    generatedBy: "bedrock" | "fallback";
    degraded?: string;
  }> {
    if (this.mode !== "live" || !this.client) {
      return {
        briefing: generateFallbackBriefing(blockers),
        generatedBy: "fallback",
      };
    }

    const userPrompt = `Blockers list:\n${JSON.stringify(blockers, null, 2)}\n\nRanked order:\n${JSON.stringify(ranking, null, 2)}`;

    try {
      const rawText = await this.callConverse(BRIEFING_SYSTEM_PROMPT, userPrompt);
      // Clean any accidental markdown or quotes
      const cleaned = rawText.replace(/[*#`_]/g, "").replace(/\n+/g, " ").trim();
      return { briefing: cleaned, generatedBy: "bedrock" };
    } catch (err: any) {
      console.warn("⚠️ Bedrock spoken briefing call failed, falling back to deterministic template:", err.message);
      return {
        briefing: generateFallbackBriefing(blockers),
        generatedBy: "fallback",
        degraded: `Bedrock briefing error: ${err.message}`,
      };
    }
  }

  // --- PR Summary ---
  public async summarizePr(
    pr: PullRequest
  ): Promise<{
    summary: BedrockPrSummaryResponse;
    generatedBy: "bedrock" | "fallback";
    degraded?: string;
  }> {
    if (this.mode !== "live" || !this.client) {
      return {
        summary: generateFallbackPrSummary(pr),
        generatedBy: "fallback",
      };
    }

    const userPrompt = JSON.stringify(pr, null, 2);

    try {
      const rawText = await this.callConverse(PR_SUMMARY_SYSTEM_PROMPT, userPrompt);
      const cleaned = cleanJsonString(rawText);
      try {
        const parsed = JSON.parse(cleaned);
        const validated = BedrockPrSummaryResponseSchema.parse(parsed);
        return { summary: validated, generatedBy: "bedrock" };
      } catch (parseErr) {
        console.warn("Bedrock PR summary JSON validation failed, retrying with repair prompt...");
        const repairPrompt = `Please fix this response into strict valid JSON matching the schema:\n${cleaned}`;
        const repaired = await this.callConverse(PR_SUMMARY_SYSTEM_PROMPT, repairPrompt);
        const parsed = JSON.parse(cleanJsonString(repaired));
        const validated = BedrockPrSummaryResponseSchema.parse(parsed);
        return { summary: validated, generatedBy: "bedrock" };
      }
    } catch (err: any) {
      console.warn("⚠️ Bedrock PR summary call failed, falling back to deterministic template:", err.message);
      return {
        summary: generateFallbackPrSummary(pr),
        generatedBy: "fallback",
        degraded: `Bedrock PR summary error: ${err.message}`,
      };
    }
  }

  // --- Nudge Draft ---
  public async draftNudge(
    reviewer: string,
    prNumber: number,
    title: string,
    tone: "friendly" | "firm" | "urgent" = "friendly"
  ): Promise<string> {
    if (this.mode !== "live" || !this.client) {
      return generateFallbackNudge(reviewer, prNumber, title, tone);
    }

    const userPrompt = `Reviewer: ${reviewer}\nPR Number: ${prNumber}\nPR Title: "${title}"\nTone: ${tone}`;

    try {
      const raw = await this.callConverse(NUDGE_SYSTEM_PROMPT, userPrompt);
      return raw.replace(/[*#`_]/g, "").trim();
    } catch (err) {
      console.warn("⚠️ Bedrock nudge draft call failed, using fallback:", err);
      return generateFallbackNudge(reviewer, prNumber, title, tone);
    }
  }
}

export const bedrockService = new BedrockAssistantService();
