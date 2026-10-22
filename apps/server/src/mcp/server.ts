import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import crypto from "node:crypto";
import { config } from "../config.js";
import { localState } from "../store/localState.js";
import {
  getBlockersInputSchema,
  handleGetBlockers,
} from "./tools/getBlockers.js";
import {
  summarizePrInputSchema,
  handleSummarizePr,
} from "./tools/summarizePr.js";
import {
  nudgeReviewerInputSchema,
  handleNudgeReviewer,
} from "./tools/nudgeReviewer.js";
import {
  snoozeIssueInputSchema,
  handleSnoozeIssue,
} from "./tools/snoozeIssue.js";

export function createMcpServer(): McpServer {
  const mcp = new McpServer(
    {
      name: "standup-chief-of-staff",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // --- Resource: standup://status ---
  mcp.resource("status", "standup://status", async (uri) => {
    const statusPayload = {
      service: "Standup Chief of Staff MCP Server",
      status: "healthy",
      dataMode: config.DATA_MODE,
      bedrockMode: config.BEDROCK_MODE,
      bedrockModelId: config.BEDROCK_MODEL_ID,
      currentUser: config.GITHUB_USER,
      monitoredRepos: config.GITHUB_REPOS,
      liveWritesEnabled: config.LIVE_WRITES,
      activeSnoozesCount: localState.getSnoozes().length,
      timestamp: new Date().toISOString(),
    };
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(statusPayload, null, 2),
        },
      ],
    };
  });

  // --- Tool 1: get_blockers ---
  mcp.registerTool(
    "get_blockers",
    {
      description:
        "Identify critical blockers for the developer's daily standup, including failing CI, stale PR reviews, merge conflicts, and overdue issues. Returns ranked blockers and a spoken audio briefing.",
      inputSchema: getBlockersInputSchema as any,
    },
    async (args: any) => {
      const callId = `call_${crypto.randomBytes(4).toString("hex")}`;
      const start = Date.now();
      console.log(`[MCP ${callId}] Calling get_blockers:`, JSON.stringify(args));

      try {
        const result = await handleGetBlockers(args);
        console.log(`[MCP ${callId}] get_blockers completed in ${Date.now() - start}ms`);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
            { type: "text" as const, text: result.spoken },
          ],
        };
      } catch (err: any) {
        console.error(`[MCP ${callId}] get_blockers error:`, err);
        return {
          isError: true,
          content: [
            { type: "text" as const, text: JSON.stringify({ error: err.message, degraded: true }) },
            {
              type: "text" as const,
              text: `I had trouble retrieving your blockers: ${err.message}. Showing offline fixtures.`,
            },
          ],
        };
      }
    }
  );

  // --- Tool 2: summarize_pr ---
  mcp.registerTool(
    "summarize_pr",
    {
      description:
        "Analyze a GitHub pull request by repo and number. Summarizes code changes, assesses merge risk (low/medium/high), identifies blocking factors, and suggests next steps with spoken output.",
      inputSchema: summarizePrInputSchema as any,
    },
    async (args: any) => {
      const callId = `call_${crypto.randomBytes(4).toString("hex")}`;
      const start = Date.now();
      console.log(`[MCP ${callId}] Calling summarize_pr:`, JSON.stringify(args));

      try {
        const result = await handleSummarizePr(args);
        console.log(`[MCP ${callId}] summarize_pr completed in ${Date.now() - start}ms`);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
            { type: "text" as const, text: result.spoken },
          ],
        };
      } catch (err: any) {
        console.error(`[MCP ${callId}] summarize_pr error:`, err);
        return {
          isError: true,
          content: [
            { type: "text" as const, text: JSON.stringify({ error: err.message }) },
            {
              type: "text" as const,
              text: `I couldn't summarize pull request ${args.number} in ${args.repo}: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  // --- Tool 3: nudge_reviewer ---
  mcp.registerTool(
    "nudge_reviewer",
    {
      description:
        "Send or simulate a reminder comment to a pull request reviewer. Operates with a two-phase confirmation: first previews the AI-drafted message and requests confirmation, then executes upon confirm=true.",
      inputSchema: nudgeReviewerInputSchema as any,
    },
    async (args: any) => {
      const callId = `call_${crypto.randomBytes(4).toString("hex")}`;
      const start = Date.now();
      console.log(`[MCP ${callId}] Calling nudge_reviewer:`, JSON.stringify(args));

      try {
        const result = await handleNudgeReviewer(args);
        console.log(`[MCP ${callId}] nudge_reviewer completed in ${Date.now() - start}ms`);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
            { type: "text" as const, text: result.spoken },
          ],
        };
      } catch (err: any) {
        console.error(`[MCP ${callId}] nudge_reviewer error:`, err);
        return {
          isError: true,
          content: [
            { type: "text" as const, text: JSON.stringify({ error: err.message }) },
            {
              type: "text" as const,
              text: `Failed to nudge ${args.reviewer}: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  // --- Tool 4: snooze_issue ---
  mcp.registerTool(
    "snooze_issue",
    {
      description:
        "Snooze a GitHub issue until a future date (e.g. 'friday', 'tomorrow', 'next week' or ISO date). Operates with two-phase confirmation. Snoozed items are excluded from the get_blockers standup briefing until expiration.",
      inputSchema: snoozeIssueInputSchema as any,
    },
    async (args: any) => {
      const callId = `call_${crypto.randomBytes(4).toString("hex")}`;
      const start = Date.now();
      console.log(`[MCP ${callId}] Calling snooze_issue:`, JSON.stringify(args));

      try {
        const result = await handleSnoozeIssue(args);
        console.log(`[MCP ${callId}] snooze_issue completed in ${Date.now() - start}ms`);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
            { type: "text" as const, text: result.spoken },
          ],
        };
      } catch (err: any) {
        console.error(`[MCP ${callId}] snooze_issue error:`, err);
        return {
          isError: true,
          content: [
            { type: "text" as const, text: JSON.stringify({ error: err.message }) },
            {
              type: "text" as const,
              text: `Failed to snooze issue ${args.issueNumber}: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  return mcp;
}
