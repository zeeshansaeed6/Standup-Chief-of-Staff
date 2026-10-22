import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header.js";
import { VoiceOrb, OrbState } from "./components/VoiceOrb.js";
import { QuickChips } from "./components/QuickChips.js";
import { BriefingCard } from "./components/BriefingCard.js";
import { PrSummaryCard } from "./components/PrSummaryCard.js";
import { ConversationPanel, Message } from "./components/ConversationPanel.js";
import { ActionConfirmModal } from "./components/ActionConfirmModal.js";
import { EventLog } from "./components/EventLog.js";
import { useMcp } from "./hooks/useMcp.js";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis.js";
import { parseIntent, SessionContext } from "./lib/intents.js";
import type { GetBlockersResult, SummarizePrResult, ConfirmationPreview } from "@standup/shared";

export function App() {
  const {
    connected,
    connecting,
    error: mcpError,
    health,
    logs,
    connect,
    callTool,
    clearLogs,
  } = useMcp();

  const { isSpeaking, muted, toggleMute, speak, cancel: cancelSpeech } =
    useSpeechSynthesis();

  // Application State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg_init",
      sender: "assistant",
      text: "Good morning! I'm your Alexa+ Standup Chief of Staff. Ask me 'What's blocking me today?' or use the quick chips below.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [requireWakeWord, setRequireWakeWord] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [blockersResult, setBlockersResult] = useState<GetBlockersResult | null>(null);
  const [prSummaryResult, setPrSummaryResult] = useState<SummarizePrResult | null>(null);

  // Two-Phase Confirmation Modal State
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    id: string;
    action: "nudge_reviewer" | "snooze_issue";
    preview: ConfirmationPreview;
    spokenPrompt: string;
    payload: Record<string, any>;
  } | null>(null);

  // Session Context for Conversational Continuity
  const sessionContext: SessionContext = {
    lastBlockers: blockersResult?.blockers,
    lastSelectedPr: prSummaryResult
      ? { repo: prSummaryResult.pr.repo, number: prSummaryResult.pr.number }
      : blockersResult?.blockers?.[0]
      ? { repo: blockersResult.blockers[0].repo, number: blockersResult.blockers[0].number }
      : undefined,
    pendingConfirmation: pendingConfirmation
      ? {
          id: pendingConfirmation.id,
          action: pendingConfirmation.action,
          payload: pendingConfirmation.payload,
        }
      : undefined,
  };

  const addMessage = useCallback((sender: "user" | "assistant", text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender,
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  // Main Utterance Handler
  const handleUtterance = useCallback(
    async (rawUtterance: string) => {
      if (!rawUtterance.trim() || isProcessing) return;

      cancelSpeech();
      addMessage("user", rawUtterance);
      setIsProcessing(true);

      const intent = parseIntent(rawUtterance, sessionContext, requireWakeWord);

      try {
        switch (intent.type) {
          case "confirm": {
            if (!pendingConfirmation) {
              const reply = "There are no pending actions to confirm.";
              addMessage("assistant", reply);
              speak(reply);
              break;
            }

            const { action, payload, id: confId } = pendingConfirmation;
            const res = await callTool(action, {
              ...payload,
              confirm: true,
              confirmationId: confId,
            });

            setPendingConfirmation(null);
            addMessage("assistant", res.spoken);
            speak(res.spoken);

            // If snooze was confirmed, refresh blockers board to show item vanished
            if (action === "snooze_issue") {
              const refreshed = await callTool("get_blockers", { limit: 5 });
              setBlockersResult(refreshed.data);
            }
            break;
          }

          case "cancel": {
            if (pendingConfirmation) {
              setPendingConfirmation(null);
              const reply = "Cancelled the action.";
              addMessage("assistant", reply);
              speak(reply);
            } else {
              const reply = "No pending action to cancel.";
              addMessage("assistant", reply);
              speak(reply);
            }
            break;
          }

          case "get_blockers": {
            const res = await callTool("get_blockers", intent.args || { limit: 5 });
            setBlockersResult(res.data);
            addMessage("assistant", res.spoken);
            speak(res.spoken);
            break;
          }

          case "summarize_pr": {
            const res = await callTool("summarize_pr", intent.args || { repo: "acme/payments-platform", number: 128 });
            setPrSummaryResult(res.data);
            addMessage("assistant", res.spoken);
            speak(res.spoken);
            break;
          }

          case "nudge_reviewer": {
            const res = await callTool("nudge_reviewer", {
              ...(intent.args || {}),
              confirm: false,
            });

            if (res.data.status === "needs_confirmation") {
              setPendingConfirmation({
                id: res.data.confirmationId,
                action: "nudge_reviewer",
                preview: res.data.preview,
                spokenPrompt: res.spoken,
                payload: intent.args || {},
              });
              addMessage("assistant", res.spoken);
              speak(res.spoken);
            } else {
              addMessage("assistant", res.spoken);
              speak(res.spoken);
            }
            break;
          }

          case "snooze_issue": {
            const res = await callTool("snooze_issue", {
              ...(intent.args || {}),
              confirm: false,
            });

            if (res.data.status === "needs_confirmation") {
              setPendingConfirmation({
                id: res.data.confirmationId,
                action: "snooze_issue",
                preview: res.data.preview,
                spokenPrompt: res.spoken,
                payload: intent.args || {},
              });
              addMessage("assistant", res.spoken);
              speak(res.spoken);
            } else {
              addMessage("assistant", res.spoken);
              speak(res.spoken);
            }
            break;
          }

          case "unknown":
          default: {
            const reply =
              intent.clarification ||
              "I didn't quite catch that. Try asking 'What's blocking me today?', 'Summarize PR 128', or 'Nudge Priya'.";
            addMessage("assistant", reply);
            speak(reply);
            break;
          }
        }
      } catch (err: any) {
        const errorReply = `Error: ${err.message || "Failed to execute MCP command"}`;
        addMessage("assistant", errorReply);
        speak(`Sorry, I encountered an error: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isProcessing,
      cancelSpeech,
      addMessage,
      sessionContext,
      requireWakeWord,
      pendingConfirmation,
      callTool,
      speak,
    ]
  );

  // Speech Recognition Hook
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onFinalTranscript: (text) => {
      handleUtterance(text);
    },
    enabled: true,
  });

  // Calculate VoiceOrb Animated State
  let orbState: OrbState = "idle";
  if (isListening) orbState = "listening";
  else if (isProcessing) orbState = "thinking";
  else if (isSpeaking) orbState = "speaking";

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        connected={connected}
        connecting={connecting}
        health={health}
        requireWakeWord={requireWakeWord}
        onToggleWakeWord={() => setRequireWakeWord((p) => !p)}
        muted={muted}
        onToggleMute={toggleMute}
        onReconnect={connect}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Voice Orb, Quick Chips & Action Cards */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Voice Orb Console Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {/* Ambient Background Light */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

            <VoiceOrb
              state={orbState}
              onStartListening={startListening}
              onStopListening={stopListening}
              isListening={isListening}
              disabled={!connected || isProcessing}
            />

            {/* Interim Transcript Live Display */}
            {(interimTranscript || transcript) && isListening && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-200 text-xs animate-pulse max-w-md text-center">
                "{interimTranscript || transcript}"
              </div>
            )}

            {/* Quick Chips */}
            <div className="mt-4 w-full">
              <QuickChips
                onSelectChip={handleUtterance}
                disabled={!connected || isProcessing}
              />
            </div>
          </div>

          {/* PR Summary Card (When open) */}
          {prSummaryResult && (
            <PrSummaryCard
              data={prSummaryResult}
              onClose={() => setPrSummaryResult(null)}
              onNudgeReviewer={(reviewer) =>
                handleUtterance(`Nudge ${reviewer} on PR ${prSummaryResult.pr.number}`)
              }
            />
          )}

          {/* Daily Standup Briefing Card */}
          {blockersResult ? (
            <BriefingCard
              data={blockersResult}
              onSelectPr={(repo, num) => handleUtterance(`Summarize PR ${num}`)}
              onNudge={(repo, num, reviewer) =>
                handleUtterance(`Nudge ${reviewer} on PR ${num}`)
              }
              onSnooze={(repo, num) => handleUtterance(`Snooze issue ${num} until Friday`)}
            />
          ) : (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <p className="text-slate-400 text-sm">
                No active standup briefing loaded yet.
              </p>
              <button
                type="button"
                onClick={() => handleUtterance("What's blocking me today?")}
                disabled={!connected}
                className="mt-3 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                Fetch Today's Standup Blockers
              </button>
            </div>
          )}
        </section>

        {/* Right Column: Real-time Conversation Transcript & MCP Event Inspector */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Conversation Panel */}
          <ConversationPanel
            messages={messages}
            onSendMessage={handleUtterance}
            disabled={!connected || isProcessing}
          />

          {/* MCP Inspector Panel for Judges */}
          <EventLog logs={logs} onClear={clearLogs} />
        </section>
      </main>

      {/* Two-Phase Confirmation Modal */}
      {pendingConfirmation && (
        <ActionConfirmModal
          preview={pendingConfirmation.preview}
          spokenPrompt={pendingConfirmation.spokenPrompt}
          onConfirm={() => handleUtterance("Yes, send it")}
          onCancel={() => handleUtterance("Cancel")}
          isExecuting={isProcessing}
        />
      )}
    </div>
  );
}
