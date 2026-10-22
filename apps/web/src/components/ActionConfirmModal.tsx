import React from "react";
import { AlertCircle, Check, X, ShieldCheck, MessageSquare, Mic } from "lucide-react";
import type { ConfirmationPreview } from "@standup/shared";

interface ActionConfirmModalProps {
  preview: ConfirmationPreview;
  spokenPrompt: string;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  preview,
  spokenPrompt,
  onConfirm,
  onCancel,
  isExecuting = false,
}) => {
  const isNudge = preview.action === "nudge_reviewer";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/80 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(0,240,255,0.3)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-700 text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                Alexa+ Two-Phase Confirmation
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Confirm {isNudge ? "Reviewer Reminder" : "Issue Snooze"}
            </h3>
          </div>
        </div>

        {/* Spoken Prompt Quote */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4">
          <p className="text-xs text-slate-300 italic">
            <span className="text-cyan-400 font-semibold not-italic mr-1">Alexa asks:</span>
            "{spokenPrompt}"
          </p>
        </div>

        {/* Action Details Card */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Target
            </span>
            <p className="text-sm font-semibold text-white">{preview.target}</p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {isNudge ? "Draft PR Comment" : "Schedule Note"}
            </span>
            <p className="text-xs text-slate-200 bg-slate-900/90 border border-slate-800 p-3 rounded-lg mt-1 font-sans">
              {preview.draftMessage}
            </p>
          </div>
        </div>

        {/* Voice Hint */}
        <div className="flex items-center gap-2 text-xs text-cyan-400/90 bg-cyan-950/30 border border-cyan-900/40 px-3 py-2 rounded-lg mb-5">
          <Mic className="w-4 h-4 shrink-0 animate-pulse text-cyan-400" />
          <span>
            You can say <strong className="text-white">"Yes, send it"</strong> or <strong className="text-white">"Cancel"</strong>, or use the buttons below.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{isExecuting ? "Executing..." : "Confirm & Send"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
