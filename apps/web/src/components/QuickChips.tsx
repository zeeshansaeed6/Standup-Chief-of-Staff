import React from "react";
import { Sparkles, FileText, Bell, Clock } from "lucide-react";

interface QuickChipsProps {
  onSelectChip: (utterance: string) => void;
  disabled?: boolean;
}

export const QuickChips: React.FC<QuickChipsProps> = ({ onSelectChip, disabled = false }) => {
  const chips = [
    {
      label: "What's blocking me?",
      icon: Sparkles,
      color: "hover:border-cyan-500 hover:text-cyan-300",
    },
    {
      label: "Summarize PR 128",
      icon: FileText,
      color: "hover:border-teal-500 hover:text-teal-300",
    },
    {
      label: "Nudge Priya on 128",
      icon: Bell,
      color: "hover:border-sky-500 hover:text-sky-300",
    },
    {
      label: "Snooze issue 42 until Friday",
      icon: Clock,
      color: "hover:border-indigo-500 hover:text-indigo-300",
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-2">
      <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
        Try saying:
      </span>
      {chips.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.label}
            type="button"
            disabled={disabled}
            onClick={() => onSelectChip(c.label)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 transition-all shadow-sm ${c.color} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-current" />
            <span>"{c.label}"</span>
          </button>
        );
      })}
    </div>
  );
};
