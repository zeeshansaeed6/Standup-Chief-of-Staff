import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { app } from "../apps/server/src/index.js";
import { localState } from "../apps/server/src/store/localState.js";

interface StepResult {
  step: string;
  passed: boolean;
  details: string;
}

async function runSmokeTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("    STANDUP CHIEF OF STAFF - END-TO-END MCP SMOKE TEST          ");
  console.log("════════════════════════════════════════════════════════════════\n");

  localState.clear();

  const PORT = 8899;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`[Smoke] Test server listening on http://localhost:${PORT}`);

  const results: StepResult[] = [];
  const clientTransport = new StreamableHTTPClientTransport(
    new URL(`http://localhost:${PORT}/mcp`)
  );
  const client = new Client({ name: "smoke-tester", version: "1.0.0" });

  try {
    // Step 1: Connect MCP Client
    await client.connect(clientTransport);
    results.push({
      step: "MCP Client Connect",
      passed: true,
      details: "Connected via Streamable HTTP",
    });

    // Step 2: List Tools
    const toolsResult = await client.listTools();
    const toolNames = toolsResult.tools.map((t) => t.name).sort();
    const expected = ["get_blockers", "nudge_reviewer", "snooze_issue", "summarize_pr"].sort();
    const hasAll = expected.every((name) => toolNames.includes(name));

    results.push({
      step: "Tool Discovery (tools/list)",
      passed: hasAll && toolNames.length >= 4,
      details: `Found: [${toolNames.join(", ")}]`,
    });

    // Step 3: Call get_blockers
    const blockersCall = await client.callTool({
      name: "get_blockers",
      arguments: { limit: 5 },
    });
    const blockersText = (blockersCall.content as any[])?.[0]?.text;
    const parsedBlockers = JSON.parse(blockersText);
    const blockersCount = parsedBlockers.blockers?.length || 0;
    const hasBriefing = typeof parsedBlockers.briefing === "string" && parsedBlockers.briefing.length > 0;

    results.push({
      step: "Call get_blockers",
      passed: blockersCount > 0 && hasBriefing,
      details: `Returned ${blockersCount} blockers, briefing: "${parsedBlockers.briefing?.slice(0, 45)}..."`,
    });

    // Step 4: Call summarize_pr
    const summaryCall = await client.callTool({
      name: "summarize_pr",
      arguments: { repo: "acme/payments-platform", number: 128 },
    });
    const summaryText = (summaryCall.content as any[])?.[0]?.text;
    const parsedSummary = JSON.parse(summaryText);
    const validSummary =
      parsedSummary.pr?.number === 128 &&
      parsedSummary.risk &&
      parsedSummary.blockingFactors?.length > 0;

    results.push({
      step: "Call summarize_pr (PR #128)",
      passed: Boolean(validSummary),
      details: `Risk: ${parsedSummary.risk}, Factors: ${parsedSummary.blockingFactors?.length}`,
    });

    // Step 5: Call nudge_reviewer (two-phase: preview then confirm)
    const nudgePhase1 = await client.callTool({
      name: "nudge_reviewer",
      arguments: {
        repo: "acme/payments-platform",
        number: 128,
        reviewer: "Priya Sharma",
        confirm: false,
      },
    });
    const nudgeP1Parsed = JSON.parse((nudgePhase1.content as any[])?.[0]?.text);
    const confId = nudgeP1Parsed.confirmationId;
    const needsConf = nudgeP1Parsed.status === "needs_confirmation" && Boolean(confId);

    let nudgeConfirmed = false;
    if (needsConf) {
      const nudgePhase2 = await client.callTool({
        name: "nudge_reviewer",
        arguments: {
          repo: "acme/payments-platform",
          number: 128,
          reviewer: "Priya Sharma",
          confirm: true,
          confirmationId: confId,
        },
      });
      const nudgeP2Parsed = JSON.parse((nudgePhase2.content as any[])?.[0]?.text);
      nudgeConfirmed = nudgeP2Parsed.status === "sent" && nudgeP2Parsed.simulated === true;
    }

    results.push({
      step: "Call nudge_reviewer (Two-phase confirm)",
      passed: needsConf && nudgeConfirmed,
      details: `Phase 1 needs_confirmation -> Phase 2 sent (simulated)`,
    });

    // Step 6: Call snooze_issue (two-phase) and assert issue 42 disappears
    const snoozePhase1 = await client.callTool({
      name: "snooze_issue",
      arguments: {
        repo: "acme/payments-platform",
        issueNumber: 42,
        until: "friday",
        confirm: false,
      },
    });
    const snoozeP1Parsed = JSON.parse((snoozePhase1.content as any[])?.[0]?.text);
    const snoozeConfId = snoozeP1Parsed.confirmationId;

    let snoozeConfirmed = false;
    if (snoozeConfId) {
      const snoozePhase2 = await client.callTool({
        name: "snooze_issue",
        arguments: {
          repo: "acme/payments-platform",
          issueNumber: 42,
          until: "friday",
          confirm: true,
          confirmationId: snoozeConfId,
        },
      });
      const snoozeP2Parsed = JSON.parse((snoozePhase2.content as any[])?.[0]?.text);
      snoozeConfirmed = snoozeP2Parsed.status === "snoozed";
    }

    // Call get_blockers again to verify issue 42 is gone
    const blockersAfterSnooze = await client.callTool({
      name: "get_blockers",
      arguments: { limit: 10 },
    });
    const afterText = (blockersAfterSnooze.content as any[])?.[0]?.text;
    const parsedAfter = JSON.parse(afterText);
    const hasIssue42 = (parsedAfter.blockers || []).some(
      (b: any) => b.repo === "acme/payments-platform" && b.number === 42
    );

    results.push({
      step: "Call snooze_issue & Verify Exclusion",
      passed: snoozeConfirmed && !hasIssue42,
      details: `Snoozed issue 42 -> excluded from subsequent get_blockers`,
    });
  } catch (err: any) {
    results.push({
      step: "MCP Execution",
      passed: false,
      details: `Exception: ${err.message}`,
    });
  } finally {
    try {
      await client.close();
    } catch {}
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // Print results table
  console.log("\nSMOKE TEST EXECUTION SUMMARY:");
  console.log("┌────────────────────────────────────────┬────────┬────────────────────────────────────────────────────────┐");
  console.log("│ Step                                   │ Result │ Details                                                │");
  console.log("├────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────┤");
  let allPassed = true;
  for (const r of results) {
    if (!r.passed) allPassed = false;
    const status = r.passed ? "  PASS  " : "  FAIL  ";
    const step = r.step.padEnd(38).slice(0, 38);
    const details = r.details.padEnd(54).slice(0, 54);
    console.log(`│ ${step} │${status}│ ${details} │`);
  }
  console.log("└────────────────────────────────────────┴────────┴────────────────────────────────────────────────────────┘\n");

  if (allPassed) {
    console.log("🎉 ALL SMOKE TESTS PASSED END-TO-END!\n");
    process.exit(0);
  } else {
    console.error("❌ SMOKE TESTS FAILED!\n");
    process.exit(1);
  }
}

runSmokeTests();
