import React from "react";
import {
  GitPullRequest,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import type { Blocker, GetBlockersResult } from "@standup/shared";

interface BriefingCardProps {
  data: GetBlockersResult;
  onSelectPr: (repo: string, number: number) => void;
  onNudge: (repo: string, number: number, reviewer: string) => void;
  onSnooze: (repo: string, number: number) => void;
}

export const BriefingCard: React.FC<BriefingCardProps> = ({
  data,
  onSelectPr,
  onNudge,
  onSnooze,
}) => {
  const getCiIcon = (status: string) => {
    switch (status) {
      case "success":
        return (
          <span title="CI Passing">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </span>
        );
      case "failure":
        return (
          <span title="CI Failing">
            <XCircle className="w-4 h-4 text-rose-400" />
          </span>
        );
      case "pending":
        return (
          <span title="CI Pending">
            <Clock className="w-4 h-4 text-amber-400" />
          </span>
        );
      default:
        return null;
    }
  };

  const getScoreBadge = (score: number) => {
    let color = "bg-slate-800 text-slate-300 border-slate-700";
    if (score >= 70) {
      color = "bg-rose-950/80 text-rose-300 border-rose-700/80";
    } else if (score >= 45) {
      color = "bg-amber-950/80 text-amber-300 border-amber-700/80";
    } else if (score >= 20) {
      color = "bg-cyan-950/80 text-cyan-300 border-cyan-800/80";
    }
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${color}`}
      >
        Score {score}
      </span>
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl transition-all">
      {/* Spoken Briefing Banner */}
      <div className="bg-gradient-to-r from-cyan-950/50 via-slate-900 to-teal-950/40 border border-cyan-900/40 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Alexa+ Spoken Standup Briefing
          </h3>
          <span className="ml-auto text-[10px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
            Engine: {data.generatedBy}
          </span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed italic">
          "{data.briefing}"
        </p>
      </div>

      {/* Ranked Blockers Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Ranked Standup Blockers ({data.blockers.length})
        </h4>
        <span className="text-[11px] text-slate-400">
          Sorted by Bedrock AI priority & impact
        </span>
      </div>

      {/* Blockers Cards List */}
      {data.blockers.length === 0 ? (
        <div className="bg-slate-950/60 border border-emerald-900/40 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-white mb-1">Zero Blockers Detected!</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You're completely in the clear. No failing CI runs, no stale review requests, and no overdue issues on your monitored GitHub repositories.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.blockers.map((item: Blocker, index: number) => {
          const isPr = item.type === "pr" || item.type === "review_request";
          return (
            <div
              key={item.id}
              className="group bg-slate-950/70 border border-slate-800/90 hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-300 flex items-center justify-center">
                    {index + 1}
                  </span>
                  {isPr ? (
                    <GitPullRequest className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-xs font-semibold text-slate-400">
                    {item.repo}#{item.number}
                  </span>
                  {getCiIcon(item.ciStatus)}
                  {getScoreBadge(item.priorityScore)}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.ageHours}h ago</span>
                </div>
              </div>

              {/* Title */}
              <h5 className="text-sm font-semibold text-slate-100 mt-2 group-hover:text-cyan-300 transition-colors">
                {item.title}
              </h5>

              {/* Reasons */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {item.reasons.map((reason, i) => (
                  <span
                    key={i}
                    className="text-[11px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded"
                  >
                    {reason}
                  </span>
                ))}
              </div>

              {/* Waiting on & Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-3 border-t border-slate-900 text-xs">
                <div className="flex items-center gap-1.5">
                  {item.waitingOn.length > 0 && (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] text-slate-400">Waiting on:</span>
                      <div className="flex gap-1">
                        {item.waitingOn.map((w, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-slate-800/90 text-cyan-200 px-2 py-0.5 rounded-full font-medium"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isPr && (
                    <button
                      type="button"
                      onClick={() => onSelectPr(item.repo, item.number)}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-800/50 hover:border-cyan-700"
                    >
                      <span>Summarize PR</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {isPr && item.waitingOn.some((w) => !w.toLowerCase().includes("you")) && (
                    <button
                      type="button"
                      onClick={() =>
                        onNudge(
                          item.repo,
                          item.number,
                          item.waitingOn.find((w) => !w.toLowerCase().includes("you")) || "Priya"
                        )
                      }
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-medium px-2.5 py-1 rounded-md bg-teal-950/40 border border-teal-800/50 hover:border-teal-700"
                    >
                      Nudge Reviewer
                    </button>
                  )}

                  {!isPr && (
                    <button
                      type="button"
                      onClick={() => onSnooze(item.repo, item.number)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2.5 py-1 rounded-md bg-indigo-950/40 border border-indigo-800/50 hover:border-indigo-700"
                    >
                      Snooze Issue
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
