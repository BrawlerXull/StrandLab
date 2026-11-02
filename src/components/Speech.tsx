"use client";
// Voice in (MediaRecorder + Gemini transcription) and voice out (speechSynthesis).
// The buttons only render where the browser supports them, so nothing breaks elsewhere.
import { useCallback, useEffect, useRef, useState } from "react";

/** Encode mono float samples as a 16-bit PCM WAV. */
function wav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  w(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: "audio/wav" });
}

/** Recorded blob (webm/opus, mp4/aac…) → 16 kHz mono WAV data URL (small, and every model accepts it). */
async function toWavDataUrl(blob: Blob): Promise<string> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close();
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const out = await off.startRendering();
  const w = wav(out.getChannelData(0), rate);
  return new Promise((ok) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.readAsDataURL(w);
  });
}

type VoiceState = "idle" | "listening" | "transcribing";

/**
 * Voice input that works in every modern browser: records with MediaRecorder, stops automatically after
 * ~1.5 s of silence (or on tap), and transcribes with Gemini via /api/transcribe.
 */
export function useVoiceInput(langId: string, onDone: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== "undefined");
  }, []);

  const stop = useCallback(() => stopRef.current?.(), []);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setError("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const n = (e as Error).name;
      setError(
        n === "NotAllowedError" || n === "SecurityError"
          ? "Microphone is blocked. Click the icon at the left of the address bar, allow the microphone, and try again."
          : n === "NotFoundError"
            ? "No microphone found on this device."
            : "Couldn't start the microphone.",
      );
      return;
    }
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported?.(t));
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    // Silence detection: stop ~1.5 s after the user finishes speaking; give up after 8 s of nothing.
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const actx = new AC();
    // Created after the permission prompt, so Chrome may start it suspended (it would then read pure silence).
    actx.resume().catch(() => {});
    const an = actx.createAnalyser();
    an.fftSize = 1024;
    actx.createMediaStreamSource(stream).connect(an);
    const data = new Float32Array(an.fftSize);
    const t0 = performance.now();
    let spoke = false,
      quietSince = 0,
      ended = false;
    const timer = window.setInterval(() => {
      an.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      setLevel(Math.min(1, rms * 12));
      const now = performance.now();
      if (rms > 0.02) {
        spoke = true;
        quietSince = 0;
      } else if (spoke) {
        quietSince ||= now;
        if (now - quietSince > 1500) finish();
      }
      if (!spoke && now - t0 > 8000) finish(true);
      if (now - t0 > 30000) finish();
    }, 100);

    function cleanup() {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      actx.close().catch(() => {});
      setLevel(0);
      stopRef.current = null;
    }
    function finish(silent = false) {
      if (ended) return;
      ended = true;
      rec.onstop = async () => {
        cleanup();
        if (silent && !spoke) {
          setState("idle");
          setError("I didn't hear anything — tap the mic and speak.");
          return;
        }
        setState("transcribing");
        try {
          const audio = await toWavDataUrl(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
          const r = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio, lang: langId }) });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error);
          if (j.text) doneRef.current(j.text);
          else setError("I couldn't make out any words — try again a little closer to the mic.");
        } catch {
          setError("Voice transcription failed — please type your question.");
        }
        setState("idle");
      };
      try {
        rec.stop();
      } catch {
        cleanup();
        setState("idle");
      }
    }
    stopRef.current = () => finish();
    rec.start(250);
    setState("listening");
  }, [state, langId]);

  useEffect(() => () => stopRef.current?.(), []);
  return { supported, state, listening: state === "listening", transcribing: state === "transcribing", error, level, start, stop };
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
