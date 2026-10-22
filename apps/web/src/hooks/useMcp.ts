import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "connect" | "tools/list" | "tools/call" | "result" | "error" | "info";
  title: string;
  durationMs?: number;
  payload?: any;
  error?: string;
}

export interface HealthInfo {
  status: string;
  dataMode: "mock" | "live";
  bedrockMode: "mock" | "live";
  version: string;
  degraded?: string;
}

export function useMcp() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const clientRef = useRef<Client | null>(null);
  const mcpUrl = (import.meta as any).env?.VITE_MCP_URL || "http://localhost:8787/mcp";
  const healthUrl = mcpUrl.replace(/\/mcp\/?$/, "/health");

  const addLog = useCallback(
    (
      type: LogEntry["type"],
      title: string,
      payload?: any,
      durationMs?: number,
      err?: string
    ) => {
      const entry: LogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleTimeString(),
        type,
        title,
        payload,
        durationMs,
        error: err,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 50));
    },
    []
  );

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        return data;
      }
    } catch {
      // health check endpoint not available yet
    }
    return null;
  }, [healthUrl]);

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    setError(null);

    const start = Date.now();
    try {
      await fetchHealth();

      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
      const client = new Client({ name: "alexa-plus-web-simulator", version: "1.0.0" });

      await client.connect(transport);
      clientRef.current = client;
      setConnected(true);

      addLog("connect", "Connected to MCP Server", { endpoint: mcpUrl }, Date.now() - start);

      // Fetch tools list
      const toolsStart = Date.now();
      const toolsResponse = await client.listTools();
      const toolNames = toolsResponse.tools.map((t) => t.name);
      setAvailableTools(toolNames);

      addLog(
        "tools/list",
        `Discovered ${toolNames.length} MCP Tools`,
        { tools: toolsResponse.tools },
        Date.now() - toolsStart
      );
    } catch (err: any) {
      console.error("[useMcp] Connection failed:", err);
      setError(err.message || "Failed to connect to MCP Server");
      setConnected(false);
      addLog("error", "Connection Failed", { endpoint: mcpUrl }, Date.now() - start, err.message);
    } finally {
      setConnecting(false);
    }
  }, [connecting, mcpUrl, fetchHealth, addLog]);

  useEffect(() => {
    connect();
    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.close();
        } catch {}
      }
    };
  }, []);

  const callTool = useCallback(
    async (
      name: string,
      args: Record<string, any>
    ): Promise<{ data: any; spoken: string }> => {
      if (!clientRef.current || !connected) {
        // Try quick reconnect
        await connect();
        if (!clientRef.current) {
          throw new Error("MCP server is not connected.");
        }
      }

      const start = Date.now();
      addLog("tools/call", `Call ${name}`, { tool: name, arguments: args });

      try {
        const result = await clientRef.current.callTool({
          name,
          arguments: args,
        });

        const duration = Date.now() - start;
        const textContent = (result.content as any[])?.[0]?.text;
        const spokenContent =
          (result.content as any[])?.[1]?.text || "Operation completed successfully.";

        let parsedData: any = {};
        try {
          parsedData = JSON.parse(textContent);
        } catch {
          parsedData = { raw: textContent };
        }

        if (result.isError) {
          addLog("error", `${name} returned error`, parsedData, duration, parsedData.error);
          throw new Error(parsedData.error || "Tool execution failed");
        }

        // If tool returned degraded information, update health badge
        if (parsedData.degraded) {
          setHealth((prev) =>
            prev ? { ...prev, degraded: parsedData.degraded } : null
          );
        }

        addLog("result", `${name} completed`, parsedData, duration);

        return {
          data: parsedData,
          spoken: spokenContent,
        };
      } catch (err: any) {
        const duration = Date.now() - start;
        addLog("error", `Failed to call ${name}`, { args }, duration, err.message);
        throw err;
      }
    },
    [connected, connect, addLog]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    connected,
    connecting,
    error,
    health,
    availableTools,
    logs,
    connect,
    callTool,
    clearLogs,
  };
}
