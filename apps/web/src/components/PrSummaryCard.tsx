import React from "react";
import {
  GitPullRequest,
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  Lightbulb,
  X,
  ExternalLink,
} from "lucide-react";
import type { SummarizePrResult } from "@standup/shared";

interface PrSummaryCardProps {
  data: SummarizePrResult;
  onClose: () => void;
  onNudgeReviewer: (reviewer: string) => void;
}

export const PrSummaryCard: React.FC<PrSummaryCardProps> = ({
  data,
  onClose,
  onNudgeReviewer,
}) => {
  const { pr, summary, risk, blockingFactors, suggestedNextStep, spoken } = data;

  const getRiskBadge = (r: string) => {
    switch (r) {
      case "high":
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-700/80">
            <AlertTriangle className="w-3.5 h-3.5" /> High Risk
          </span>
        );
      case "medium":
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
            <AlertTriangle className="w-3.5 h-3.5" /> Medium Risk
          </span>
        );
      case "low":
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/80">
            <CheckCircle2 className="w-3.5 h-3.5" /> Low Risk
          </span>
        );
    }
  };

  const totalAdditions = pr.filesChanged?.reduce((s, f) => s + f.additions, 0) || 0;
  const totalDeletions = pr.filesChanged?.reduce((s, f) => s + f.deletions, 0) || 0;

  return (
    <div className="bg-slate-900/90 border border-cyan-800/50 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,240,255,0.15)] relative animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">{pr.repo}#{pr.number}</span>
              {getRiskBadge(risk)}
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">{pr.title}</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close PR summary"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Spoken Output Note */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-4 text-xs text-slate-300 italic">
        <span className="text-cyan-400 font-semibold not-italic mr-1.5">Spoken briefing:</span>
        "{spoken}"
      </div>

      {/* Summary Body */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Architectural Changes
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          {summary}
        </p>
      </div>

      {/* Blocking Factors */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Blocking Factors
        </h4>
        <div className="space-y-1.5">
          {blockingFactors.map((bf, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-xs text-amber-200 bg-amber-950/30 border border-amber-900/50 px-3 py-1.5 rounded-lg"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{bf}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Next Step */}
      <div className="bg-gradient-to-r from-teal-950/40 to-slate-950 border border-teal-800/40 rounded-xl p-3 mb-4 flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <h5 className="text-xs font-bold text-teal-300 uppercase tracking-wider">
            Suggested Next Action
          </h5>
          <p className="text-xs text-slate-200 mt-0.5">{suggestedNextStep}</p>
        </div>
      </div>

      {/* Files Changed & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <FileCode2 className="w-4 h-4 text-slate-400" />
          <span>{pr.filesChanged?.length || 0} files</span>
          <span className="text-emerald-400 font-mono">+{totalAdditions}</span>
          <span className="text-rose-400 font-mono">-{totalDeletions}</span>
        </div>

        <div className="flex items-center gap-2">
          {pr.requestedReviewers?.length > 0 && (
            <button
              type="button"
              onClick={() => onNudgeReviewer(pr.requestedReviewers[0])}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
            >
              Nudge {pr.requestedReviewers[0]}
            </button>
          )}

          <a
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
          >
            <span>GitHub PR</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
