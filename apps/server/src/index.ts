import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { createMcpServer } from "./mcp/server.js";

const app = express();

// Enable CORS for WEB_ORIGIN and any localhost port for testing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        origin === config.WEB_ORIGIN ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local hackathon demo
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Mcp-Session-Id",
      "MCP-Protocol-Version",
      "Authorization",
    ],
    exposedHeaders: ["Mcp-Session-Id", "MCP-Protocol-Version"],
    credentials: true,
  })
);

app.use(express.json());

// Health Check Endpoint
app.get("/health", (_req, res) => {
  let degradedReason: string | undefined = undefined;
  if (config.DATA_MODE === "live" && !config.GITHUB_TOKEN) {
    degradedReason = "DATA_MODE is live but GITHUB_TOKEN is missing";
  } else if (config.BEDROCK_MODE === "live" && !config.AWS_ACCESS_KEY_ID) {
    degradedReason = "BEDROCK_MODE is live but AWS credentials are missing";
  }

  res.json({
    status: "ok",
    dataMode: config.DATA_MODE,
    bedrockMode: config.BEDROCK_MODE,
    version: "1.0.0",
    degraded: degradedReason,
  });
});

// MCP Streamable HTTP Endpoint (Stateless mode)
app.all("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: any) {
    console.error("[MCP Endpoint Error]:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error in MCP transport", message: err.message });
    }
  }
});

const PORT = config.PORT;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║             STANDUP CHIEF OF STAFF - MCP SERVER                ║
╠════════════════════════════════════════════════════════════════╣
║  Port:          ${PORT}                                           ║
║  MCP Endpoint:  http://localhost:${PORT}/mcp                        ║
║  Health Check:  http://localhost:${PORT}/health                     ║
║  Data Mode:     ${config.DATA_MODE.padEnd(46)}║
║  Bedrock Mode:  ${config.BEDROCK_MODE.padEnd(46)}║
║  GitHub User:   ${config.GITHUB_USER.padEnd(46)}║
║  AWS Region:    ${config.AWS_REGION.padEnd(46)}║
║  Live Writes:   ${String(config.LIVE_WRITES).padEnd(46)}║
╚════════════════════════════════════════════════════════════════╝
    `);
  });
}

export { app };
