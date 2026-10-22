import { describe, it, expect } from "vitest";
import { cleanJsonString } from "../src/bedrock/client.js";
import { BedrockRankingResponseSchema } from "@standup/shared";

describe("Bedrock Output Sanitization and Repair Logic", () => {
  it("cleans raw markdown code blocks", () => {
    const raw = "```json\n{\n  \"ranked\": [],\n  \"oneLineSummary\": \"All clear\"\n}\n```";
    const cleaned = cleanJsonString(raw);
    expect(cleaned).toBe('{\n  "ranked": [],\n  "oneLineSummary": "All clear"\n}');
    const parsed = JSON.parse(cleaned);
    const validated = BedrockRankingResponseSchema.parse(parsed);
    expect(validated.oneLineSummary).toBe("All clear");
  });

  it("cleans code fences with no language tag", () => {
    const raw = "```\n{\"ranked\": [{\"id\": \"pr_1\", \"rank\": 1, \"whyItMatters\": \"Important\"}], \"oneLineSummary\": \"Top PR\"}\n```";
    const cleaned = cleanJsonString(raw);
    const parsed = JSON.parse(cleaned);
    const validated = BedrockRankingResponseSchema.parse(parsed);
    expect(validated.ranked.length).toBe(1);
    expect(validated.ranked[0].whyItMatters).toBe("Important");
  });

  it("handles whitespace and trailing newlines gracefully", () => {
    const raw = "   \n\n```json\n{\"ranked\": [], \"oneLineSummary\": \"Clean\"}\n```\n\n  ";
    const cleaned = cleanJsonString(raw);
    expect(JSON.parse(cleaned).oneLineSummary).toBe("Clean");
  });
});
