import { describe, it, expect, beforeEach } from "vitest";
import { handleGetBlockers } from "../src/mcp/tools/getBlockers.js";
import { handleSummarizePr } from "../src/mcp/tools/summarizePr.js";
import { handleNudgeReviewer } from "../src/mcp/tools/nudgeReviewer.js";
import { handleSnoozeIssue } from "../src/mcp/tools/snoozeIssue.js";
import { localState } from "../src/store/localState.js";

describe("MCP Tools End-to-End Suite against MockProvider", () => {
  beforeEach(() => {
    localState.clear();
  });

  it("1. get_blockers returns ranked blockers and a spoken briefing", async () => {
    const { data, spoken } = await handleGetBlockers({ limit: 5 });
    expect(data.blockers.length).toBeGreaterThanOrEqual(1);
    expect(spoken).toBeDefined();
    expect(data.briefing).toBe(spoken);
    // PR 128 or Issue 42 should be near the top
    const topIds = data.blockers.map((b) => b.number);
    expect(topIds).toContain(128);
  });

  it("2. summarize_pr returns detailed analysis for PR 128", async () => {
    const { data, spoken } = await handleSummarizePr({
      repo: "acme/payments-platform",
      number: 128,
    });
    expect(data.pr.number).toBe(128);
    expect(data.pr.title).toBe("Refactor auth token refresh");
    expect(data.risk).toBeDefined();
    expect(data.blockingFactors.length).toBeGreaterThan(0);
    expect(spoken).toBeDefined();
  });

  it("3. nudge_reviewer handles two-phase confirmation and simulation", async () => {
    // Phase 1: Request confirmation
    const phase1 = await handleNudgeReviewer({
      repo: "acme/payments-platform",
      number: 128,
      reviewer: "Priya Sharma",
      confirm: false,
    });

    expect(phase1.data.status).toBe("needs_confirmation");
    if (phase1.data.status === "needs_confirmation") {
      expect(phase1.data.confirmationId).toBeDefined();
      expect(phase1.data.preview.target).toContain("Priya Sharma");
      expect(phase1.data.preview.draftMessage).toBeDefined();

      const confId = phase1.data.confirmationId;

      // Phase 2: Confirm
      const phase2 = await handleNudgeReviewer({
        repo: "acme/payments-platform",
        number: 128,
        reviewer: "Priya Sharma",
        confirm: true,
        confirmationId: confId,
      });

      expect(phase2.data.status).toBe("sent");
      if (phase2.data.status === "sent") {
        expect(phase2.data.simulated).toBe(true);
      }
    }
  });

  it("4. snooze_issue two-phase confirmation and exclusion from get_blockers", async () => {
    // Verify issue 42 exists initially in blockers
    const initial = await handleGetBlockers({ limit: 10 });
    const has42Initially = initial.data.blockers.some(
      (b) => b.repo === "acme/payments-platform" && b.number === 42
    );
    expect(has42Initially).toBe(true);

    // Phase 1: Preview snooze
    const phase1 = await handleSnoozeIssue({
      repo: "acme/payments-platform",
      issueNumber: 42,
      until: "friday",
      confirm: false,
    });

    expect(phase1.data.status).toBe("needs_confirmation");
    if (phase1.data.status === "needs_confirmation") {
      const confId = phase1.data.confirmationId;

      // Phase 2: Confirm snooze
      const phase2 = await handleSnoozeIssue({
        repo: "acme/payments-platform",
        issueNumber: 42,
        until: "friday",
        confirm: true,
        confirmationId: confId,
      });

      expect(phase2.data.status).toBe("snoozed");

      // Verify issue 42 is now excluded from blockers
      const afterSnooze = await handleGetBlockers({ limit: 10 });
      const has42After = afterSnooze.data.blockers.some(
        (b) => b.repo === "acme/payments-platform" && b.number === 42
      );
      expect(has42After).toBe(false);
    }
  });

  it("5. rejects expired confirmation tokens", async () => {
    await expect(
      handleNudgeReviewer({
        repo: "acme/payments-platform",
        number: 128,
        reviewer: "Priya",
        confirm: true,
        confirmationId: "conf_nonexistent_token",
      })
    ).rejects.toThrow(/expired or does not exist/);
  });
});
