import { describe, it, expect } from "vitest";
import { parseIntent, cleanUtterance } from "../src/lib/intents.js";
import type { Blocker } from "@standup/shared";

describe("Voice Intent Router", () => {
  it("cleans wake word 'Alexa,' from utterance", () => {
    expect(cleanUtterance("Alexa, what's blocking me?")).toBe("what's blocking me?");
    expect(cleanUtterance("Alexa what's blocking me?")).toBe("what's blocking me?");
    expect(cleanUtterance("What's blocking me?")).toBe("What's blocking me?");
  });

  it("parses get_blockers intent", () => {
    const res1 = parseIntent("What's blocking me today?");
    expect(res1.type).toBe("get_blockers");

    const res2 = parseIntent("Give me my daily standup briefing");
    expect(res2.type).toBe("get_blockers");
  });

  it("parses summarize_pr with number", () => {
    const res = parseIntent("Summarize pull request 128");
    expect(res.type).toBe("summarize_pr");
    expect(res.args?.number).toBe(128);
  });

  it("parses summarize_pr with loose reference 'the auth PR'", () => {
    const mockBlockers: Blocker[] = [
      {
        id: "pr_128",
        type: "pr",
        repo: "acme/payments-platform",
        number: 128,
        title: "Refactor auth token refresh",
        url: "",
        priorityScore: 70,
        reasons: [],
        waitingOn: [],
        ageHours: 20,
        ciStatus: "success",
      },
    ];

    const res = parseIntent("Summarize the auth PR", { lastBlockers: mockBlockers });
    expect(res.type).toBe("summarize_pr");
    expect(res.args?.number).toBe(128);
  });

  it("parses nudge_reviewer with reviewer name and implicit PR from context", () => {
    const res = parseIntent("Nudge Priya on that review", {
      lastSelectedPr: { repo: "acme/payments-platform", number: 128 },
    });
    expect(res.type).toBe("nudge_reviewer");
    expect(res.args?.reviewer).toBe("Priya Sharma");
    expect(res.args?.number).toBe(128);
    expect(res.args?.confirm).toBe(false);
  });

  it("parses snooze_issue with number and natural date", () => {
    const res = parseIntent("Snooze issue 42 until Friday");
    expect(res.type).toBe("snooze_issue");
    expect(res.args?.issueNumber).toBe(42);
    expect(res.args?.until).toBe("friday");
  });

  it("parses confirmation and cancellation phrases", () => {
    expect(parseIntent("Yes, send it").type).toBe("confirm");
    expect(parseIntent("Confirm").type).toBe("confirm");
    expect(parseIntent("Go ahead").type).toBe("confirm");
    expect(parseIntent("No, cancel").type).toBe("cancel");
    expect(parseIntent("Never mind").type).toBe("cancel");
  });

  it("provides helpful clarification on unknown intent", () => {
    const res = parseIntent("Order me a pizza");
    expect(res.type).toBe("unknown");
    expect(res.clarification).toContain("Try asking");
  });
});
