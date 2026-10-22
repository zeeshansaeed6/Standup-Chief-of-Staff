import React from "react";
import { Mic, Volume2, Sparkles, Loader2 } from "lucide-react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface VoiceOrbProps {
  state: OrbState;
  onStartListening: () => void;
  onStopListening: () => void;
  isListening: boolean;
  disabled?: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  onStartListening,
  onStopListening,
  isListening,
  disabled = false,
}) => {
  const getOrbStyles = () => {
    switch (state) {
      case "listening":
        return "border-cyan-400 bg-cyan-950/60 shadow-[0_0_50px_rgba(0,240,255,0.7)] scale-105";
      case "thinking":
        return "border-teal-400 bg-teal-950/60 shadow-[0_0_40px_rgba(13,242,201,0.6)] animate-pulse";
      case "speaking":
        return "border-cyan-300 bg-blue-950/70 shadow-[0_0_45px_rgba(34,211,238,0.7)] scale-105";
      case "idle":
      default:
        return "border-slate-700 bg-slate-900/80 shadow-[0_0_25px_rgba(0,240,255,0.25)] hover:border-cyan-500/60 hover:shadow-[0_0_35px_rgba(0,240,255,0.4)]";
    }
  };

  const getStatusLabel = () => {
    switch (state) {
      case "listening":
        return "Listening... (Release to send)";
      case "thinking":
        return "Thinking & Consulting MCP...";
      case "speaking":
        return "Speaking...";
      case "idle":
      default:
        return "Hold to Talk or Hold Spacebar";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative flex items-center justify-center">
        {/* Outer Ripple Rings for Listening */}
        {state === "listening" && (
          <>
            <div className="absolute w-44 h-44 rounded-full border border-cyan-400/30 animate-ping pointer-events-none" />
            <div className="absolute w-52 h-52 rounded-full border border-cyan-500/20 animate-pulse pointer-events-none" />
          </>
        )}

        {/* Ambient Ring for Speaking */}
        {state === "speaking" && (
          <div className="absolute w-48 h-48 rounded-full border border-teal-400/40 animate-pulse pointer-events-none" />
        )}

        {/* The Main Orb Button */}
        <button
          type="button"
          onMouseDown={onStartListening}
          onMouseUp={onStopListening}
          onTouchStart={onStartListening}
          onTouchEnd={onStopListening}
          disabled={disabled}
          aria-label={getStatusLabel()}
          className={`relative z-10 w-36 h-36 rounded-full border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer select-none focus:outline-none focus:ring-4 focus:ring-cyan-500/50 ${getOrbStyles()} ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {state === "listening" && (
            <div className="flex flex-col items-center animate-bounce text-cyan-300">
              <Mic className="w-10 h-10" />
            </div>
          )}

          {state === "thinking" && (
            <div className="flex flex-col items-center text-teal-300">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
          )}

          {state === "speaking" && (
            <div className="flex items-center gap-1.5 h-10 px-4">
              <span className="w-1.5 bg-cyan-400 rounded-full animate-wave-bar" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 bg-cyan-300 rounded-full animate-wave-bar" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 bg-teal-400 rounded-full animate-wave-bar" style={{ animationDelay: "300ms" }} />
              <span className="w-1.5 bg-cyan-300 rounded-full animate-wave-bar" style={{ animationDelay: "450ms" }} />
              <span className="w-1.5 bg-cyan-400 rounded-full animate-wave-bar" style={{ animationDelay: "600ms" }} />
            </div>
          )}

          {state === "idle" && (
            <div className="flex flex-col items-center text-slate-300 group-hover:text-cyan-300 transition-colors">
              <Sparkles className="w-10 h-10 text-cyan-400/80 mb-1" />
            </div>
          )}

          {/* Glowing Center Core */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-cyan-500/10 to-teal-400/10 pointer-events-none" />
        </button>
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs font-medium tracking-wide uppercase text-cyan-400/90">
          {getStatusLabel()}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {state === "listening" ? "Say your command now" : "Hold Spacebar anywhere to talk"}
        </p>
      </div>
    </div>
  );
};
