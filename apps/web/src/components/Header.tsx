import React from "react";
import { Volume2, VolumeX, Radio, ShieldAlert, Cpu, Database, RefreshCw } from "lucide-react";
import type { HealthInfo } from "../hooks/useMcp.js";

interface HeaderProps {
  connected: boolean;
  connecting: boolean;
  health: HealthInfo | null;
  requireWakeWord: boolean;
  onToggleWakeWord: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onReconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connected,
  connecting,
  health,
  requireWakeWord,
  onToggleWakeWord,
  muted,
  onToggleMute,
  onReconnect,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <Radio className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Alexa+ <span className="text-cyan-400">Simulator</span>
              </h1>
              <span className="text-[10px] uppercase font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                Standup Chief of Staff
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Voice-first MCP Assistant for Daily Developer Standups
            </p>
          </div>
        </div>

        {/* Center / Right Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Connection Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
              connected
                ? "bg-emerald-950/50 text-emerald-300 border-emerald-800/60"
                : connecting
                ? "bg-amber-950/50 text-amber-300 border-amber-800/60"
                : "bg-rose-950/50 text-rose-300 border-rose-800/60"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected
                  ? "bg-emerald-400 animate-pulse"
                  : connecting
                  ? "bg-amber-400 animate-ping"
                  : "bg-rose-500"
              }`}
            />
            <span>{connected ? "MCP Online" : connecting ? "Connecting..." : "Offline"}</span>
            {!connected && (
              <button
                onClick={onReconnect}
                title="Retry MCP connection"
                className="ml-1 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Data Mode Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Data:</span>
            <span className="font-semibold text-cyan-300">
              {health?.dataMode ? health.dataMode : "mock"}
            </span>
          </div>

          {/* AI Bedrock Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <Cpu className="w-3 h-3 text-teal-400" />
            <span>AI:</span>
            <span className="font-semibold text-teal-300">
              {health?.bedrockMode === "live" ? "Bedrock Nova" : "Bedrock Mock"}
            </span>
          </div>

          {/* Degraded Badge (if applicable) */}
          {health?.degraded && (
            <div
              title={health.degraded}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-700/80 text-[11px] text-amber-300 animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Degraded (Fallback Active)</span>
            </div>
          )}

          {/* Wake Word Toggle */}
          <button
            type="button"
            onClick={onToggleWakeWord}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-all ${
              requireWakeWord
                ? "bg-cyan-950/60 border-cyan-700 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Say "Alexa" first:</span>
            <span className="font-bold">{requireWakeWord ? "ON" : "OFF"}</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute voice" : "Mute voice"}
            className={`p-1.5 rounded-full border transition-colors ${
              muted
                ? "bg-rose-950/60 border-rose-800 text-rose-300"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400"
            }`}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
