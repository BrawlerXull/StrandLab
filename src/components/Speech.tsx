"use client";
// Voice in (Web Speech recognition) and voice out (speechSynthesis). Both are optional browser features:
// the buttons only render where supported, so nothing breaks elsewhere.
import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typing for the (still prefixed in Chrome/Safari) SpeechRecognition API.
type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecCtor = new () => Rec;

function recCtor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Press-to-talk dictation. `onText` gets the live transcript (interim + final). */
export function useDictation(lang: string, onText: (t: string) => void, onDone?: (t: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Rec | null>(null);
  const last = useRef("");
  useEffect(() => setSupported(!!recCtor()), []);

  const stop = useCallback(() => rec.current?.stop(), []);
  const start = useCallback(() => {
    const C = recCtor();
    if (!C) return;
    setError("");
    const r = new C();
    r.lang = lang || (typeof navigator !== "undefined" ? navigator.language : "en-US");
    r.interimResults = true;
    r.continuous = false;
    last.current = "";
    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join(" ").trim();
      last.current = t;
      onText(t);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Microphone permission was blocked." : e.error === "no-speech" ? "Didn't catch that — try again." : "Voice input stopped.");
    r.onend = () => {
      setListening(false);
      if (last.current && onDone) onDone(last.current);
    };
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, [lang, onText, onDone]);

  useEffect(() => () => rec.current?.stop(), []);
  return { supported, listening, error, start, stop };
}

/** Strip the light markdown the coach uses so it reads naturally. */
const plain = (md: string) => md.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/^\s*[-•]\s+/gm, "").replace(/^\s*(\d+)\.\s+/gm, "$1: ");

/** Read text aloud; one utterance at a time across the app. */
export function useSpeak() {
  const [supported, setSupported] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((id: string, text: string, lang?: string) => {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(plain(text));
    // Detect script for "auto" so Hindi/Arabic/etc. replies use a matching voice.
    const guess = lang || guessLang(text);
    if (guess) {
      u.lang = guess;
      const v = s.getVoices().find((x) => x.lang.toLowerCase().startsWith(guess.slice(0, 2).toLowerCase()));
      if (v) u.voice = v;
    }
    u.rate = 0.98;
    u.onend = u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
    setSpeakingId(id);
    s.speak(u);
  }, []);

  return { supported, speakingId, speak, stop };
}

function guessLang(t: string): string | undefined {
  if (/[ऀ-ॿ]/.test(t)) return "hi-IN";
  if (/[؀-ۿ]/.test(t)) return "ar-SA";
  if (/[ঀ-৿]/.test(t)) return "bn-IN";
  if (/[஀-௿]/.test(t)) return "ta-IN";
  if (/[぀-ヿ]/.test(t)) return "ja-JP";
  if (/[가-힯]/.test(t)) return "ko-KR";
  if (/[一-鿿]/.test(t)) return "zh-CN";
  return undefined;
}

export function MicIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  );
}

export function SpeakerIcon({ className = "h-3.5 w-3.5", on }: { className?: string; on?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      {on ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  );
}
