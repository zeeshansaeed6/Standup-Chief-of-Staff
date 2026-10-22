import React, { useState } from "react";
import { Terminal, Copy, Check, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { LogEntry } from "../hooks/useMcp.js";

interface EventLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const EventLog: React.FC<EventLogProps> = ({ logs, onClear }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyAllLogs = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLogBadge = (type: LogEntry["type"]) => {
    switch (type) {
      case "connect":
        return "bg-emerald-950 text-emerald-300 border-emerald-800";
      case "tools/list":
        return "bg-teal-950 text-teal-300 border-teal-800";
      case "tools/call":
        return "bg-cyan-950 text-cyan-300 border-cyan-800";
      case "result":
        return "bg-sky-950 text-sky-300 border-sky-800";
      case "error":
        return "bg-rose-950 text-rose-300 border-rose-800";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Panel Header */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-slate-300 hover:text-white font-semibold transition-colors"
        >
          {isOpen ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />}
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Real-time MCP Protocol Inspector</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
            {logs.length} events
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyAllLogs}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px]"
            title="Copy full JSON log for audit"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Log"}</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-900 p-2">
          {logs.length === 0 ? (
            <div className="p-4 text-center text-slate-500 italic">
              No MCP traffic recorded yet. Connect to server or call a tool.
            </div>
          ) : (
            logs.map((entry) => {
              const isExpanded = !!expandedItems[entry.id];
              const hasPayload = entry.payload !== undefined || entry.error !== undefined;

              return (
                <div key={entry.id} className="py-2 px-2 hover:bg-slate-900/40 rounded transition-colors">
                  <div
                    className={`flex items-center justify-between gap-2 cursor-pointer ${
                      hasPayload ? "cursor-pointer" : ""
                    }`}
                    onClick={() => hasPayload && toggleExpand(entry.id)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {entry.timestamp}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border uppercase shrink-0 ${getLogBadge(
                          entry.type
                        )}`}
                      >
                        {entry.type}
                      </span>
                      <span className="text-slate-200 truncate font-semibold">
                        {entry.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {entry.durationMs !== undefined && (
                        <span className="text-[10px] text-cyan-400 font-bold">
                          {entry.durationMs}ms
                        </span>
                      )}
                      {hasPayload && (
                        <span className="text-slate-500 text-[10px]">
                          {isExpanded ? "▲ hide" : "▼ json"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON view */}
                  {isExpanded && hasPayload && (
                    <div className="mt-2 p-2.5 rounded bg-black/60 border border-slate-800 overflow-x-auto">
                      {entry.error && (
                        <p className="text-rose-400 font-bold mb-1">
                          Error: {entry.error}
                        </p>
                      )}
                      {entry.payload && (
                        <pre className="text-[11px] text-slate-300 leading-tight">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
