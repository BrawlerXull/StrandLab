"use client";
// App-wide state shared across pages (scan → details → results) + the coach panel.
// Photos live in memory; the measured profile, quiz answers, climate and a small copy of the
// front photo are mirrored to sessionStorage so a refresh on /results doesn't lose the scan.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CapturedPhoto } from "./Capture";
import type { Climate, Measured, Part, PartResult, Shot } from "@/lib/types";
import { PART_LIST } from "@/lib/types";

export type Hist = { date: string; frizz: number | null; density: number | null; type: string | null };

type State = {
  photos: Partial<Record<Shot, CapturedPhoto>>;
  setPhoto: (s: Shot, p: CapturedPhoto | null) => void;
  answers: (number | null)[];
  setAnswers: (a: (number | null)[]) => void;
  climate: Climate | null;
  setClimate: (c: Climate | null) => void;
  measured: Measured | null;
  analyzing: boolean;
  progress: Record<Part, "idle" | "running" | "done" | "error">;
  error: string;
  startAnalysis: () => void;
  /** No-photo route: store a self-reported profile and skip the AI analysis. */
  setSelfMeasured: (m: Measured) => void;
  frontUrl: string | null;
  history: Hist[];
  reset: () => void;
  // Coach
  coachOpen: boolean;
  openCoach: (question?: string, label?: string) => void;
  closeCoach: () => void;
  pendingQuestion: { q: string; label?: string } | null;
  clearPending: () => void;
  coachContext: { label: string; text: string } | null;
  setCoachContext: (c: { label: string; text: string } | null) => void;
};

const Ctx = createContext<State | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
};

const SKEY = "strandlab.session";
const HKEY = "strandlab.history";
const EMPTY = [null, null, null, null];

async function smallDataUrl(blob: Blob): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, 900 / bmp.width);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = useState<Partial<Record<Shot, CapturedPhoto>>>({});
  const [answers, setAnswers] = useState<(number | null)[]>(EMPTY);
  const [climate, setClimate] = useState<Climate | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<Record<Part, "idle" | "running" | "done" | "error">>({ curl: "idle", length: "idle", density: "idle" });
  const [error, setError] = useState("");
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<Hist[]>([]);
  const [coachOpen, setCoachOpen] = useState(false);
  const [pendingQuestion, setPending] = useState<{ q: string; label?: string } | null>(null);
  const [coachContext, setCoachContext] = useState<{ label: string; text: string } | null>(null);
  const runId = useRef(0);
  const loaded = useRef(false);

  // Restore session
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(SKEY) || "null");
      if (s) {
        if (s.answers) setAnswers(s.answers);
        if (s.climate) setClimate(s.climate);
        if (s.measured) setMeasured(s.measured);
        if (s.frontUrl) setFrontUrl(s.frontUrl);
      }
      setHistory(JSON.parse(localStorage.getItem(HKEY) || "[]"));
    } catch {
      /* storage blocked */
    }
    loaded.current = true;
  }, []);

  // Persist session
  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(SKEY, JSON.stringify({ answers, climate, measured, frontUrl }));
    } catch {
      /* quota / private mode */
    }
  }, [answers, climate, measured, frontUrl]);

  const setPhoto = useCallback((s: Shot, p: CapturedPhoto | null) => {
    setPhotos((x) => ({ ...x, [s]: p ?? undefined }));
    if (s === "front" && p) smallDataUrl(p.blob).then(setFrontUrl).catch(() => setFrontUrl(p.url));
  }, []);

  const startAnalysis = useCallback(async () => {
    const id = ++runId.current;
    setAnalyzing(true);
    setMeasured(null);
    setError("");
    setProgress({ curl: "running", length: "running", density: "running" });
    // Which photos each detector group needs (keeps uploads small).
    const SHOTS_FOR: Record<Part, Shot[]> = { curl: ["front", "right", "left"], length: ["front"], density: ["tilt", "right"] };
    const runPart = async (part: Part): Promise<PartResult> => {
      const fd = new FormData();
      fd.append("part", part);
      SHOTS_FOR[part].forEach((s) => fd.append(s, photos[s]!.blob, `${s}.jpg`));
      fd.append("boxes", JSON.stringify(Object.fromEntries(SHOTS_FOR[part].map((s) => [s, photos[s]!.box]))));
      try {
        let r = await fetch("/api/analyze", { method: "POST", body: fd });
        // One automatic retry on gateway timeouts (reruns this detector group).
        if (r.status === 502 || r.status === 504) r = await fetch("/api/analyze", { method: "POST", body: fd });
        const j = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
        if (!r.ok) throw new Error(j.error || "Analysis failed");
        if (id === runId.current) setProgress((p) => ({ ...p, [part]: "done" }));
        return j.result as PartResult;
      } catch (e) {
        if (id === runId.current) setProgress((p) => ({ ...p, [part]: "error" }));
        throw e;
      }
    };
    const settled = await Promise.allSettled(PART_LIST.map(runPart));
    if (id !== runId.current) return;
    const ok = settled.filter((r): r is PromiseFulfilledResult<PartResult> => r.status === "fulfilled").map((r) => r.value);
    if (!ok.length) {
      setError((settled[0] as PromiseRejectedResult).reason?.message || "Analysis failed");
      setAnalyzing(false);
      return;
    }
    const m: Measured = { type: null, frizz: null, density: null, length: null, issues: [], framing: {}, trace: [] };
    for (const p of ok) {
      if (p.type) m.type = p.type;
      if (p.frizz) m.frizz = p.frizz;
      if (p.density) m.density = p.density;
      if (p.length) m.length = p.length;
      m.issues.push(...p.issues);
      Object.assign(m.framing, p.framing);
      m.trace!.push(...p.trace);
    }
    settled.forEach((r, i) => {
      if (r.status === "rejected") m.issues.push({ detector: PART_LIST[i], code: "request_failed", hint: "This measurement didn't finish — try again." });
    });
    setMeasured(m);
    if (m.type || m.frizz) {
      setHistory((h) => {
        const next = [...h, { date: new Date().toISOString(), frizz: m.frizz?.level ?? null, density: m.density?.value ?? null, type: m.type?.mapping ?? null }].slice(-12);
        try {
          localStorage.setItem(HKEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }
    setAnalyzing(false);
  }, [photos]);

  const setSelfMeasured = useCallback((m: Measured) => {
    runId.current++;
    setPhotos({});
    setFrontUrl(null);
    setAnalyzing(false);
    setError("");
    setMeasured({ ...m, source: "self" });
  }, []);

  const reset = useCallback(() => {
    runId.current++;
    setPhotos({});
    setAnswers(EMPTY);
    setMeasured(null);
    setAnalyzing(false);
    setError("");
    setFrontUrl(null);
    try {
      sessionStorage.removeItem(SKEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value: State = {
    photos,
    setPhoto,
    answers,
    setAnswers,
    climate,
    setClimate,
    measured,
    analyzing,
    progress,
    error,
    startAnalysis,
    setSelfMeasured,
    frontUrl,
    history,
    reset,
    coachOpen,
    openCoach: (q, label) => {
      if (q) setPending({ q, label });
      setCoachOpen(true);
    },
    closeCoach: () => setCoachOpen(false),
    pendingQuestion,
    clearPending: () => setPending(null),
    coachContext,
    setCoachContext,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Rebuild a Blob from a data URL (for live VTO previews after a refresh). */
export function dataUrlToBlob(u: string): Blob {
  const [head, b64] = u.split(",");
  const mime = head.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
