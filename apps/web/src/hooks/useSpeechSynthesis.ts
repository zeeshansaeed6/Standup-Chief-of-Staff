import { useState, useEffect, useRef, useCallback } from "react";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Look for natural or clear English voice
      const preferred =
        voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Jenny"))) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];

      if (preferred) {
        voiceRef.current = preferred;
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      // Cancel any ongoing speech
      cancel();

      // Clean speech text
      const cleanText = text
        .replace(/[*#`_\[\]]/g, "")
        .replace(/https?:\/\/[^\s]+/g, "")
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }
      utterance.rate = 1.05; // Slightly conversational pace
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.warn("[SpeechSynthesis] error:", e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [muted, cancel]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (!prev) {
        cancel();
      }
      return !prev;
    });
  }, [cancel]);

  return {
    isSpeaking,
    muted,
    toggleMute,
    speak,
    cancel,
  };
}
