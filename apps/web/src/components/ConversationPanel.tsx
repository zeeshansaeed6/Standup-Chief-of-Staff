import React, { useRef, useEffect, useState } from "react";
import { User, Radio, Send } from "lucide-react";

export interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  isConfirmationPrompt?: boolean;
}

interface ConversationPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  onSendMessage,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[520px] shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Voice Conversation Transcript
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          {messages.length} messages
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  isUser
                    ? "bg-cyan-600 text-white"
                    : "bg-gradient-to-tr from-cyan-400 to-teal-400 text-slate-950"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                  isUser
                    ? "bg-cyan-950/80 border border-cyan-800/80 text-cyan-100 rounded-tr-none"
                    : "bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-semibold text-[10px] uppercase tracking-wider opacity-60">
                    {isUser ? "You" : "Alexa+"}
                  </span>
                  <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Text Fallback Input Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={disabled}
            placeholder="Type a voice command (or use push-to-talk)..."
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={disabled || !inputText.trim()}
            aria-label="Send utterance"
            className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
