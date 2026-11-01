"use client";
import { useApp } from "./AppState";
import type { Part } from "@/lib/types";

const ROWS: { part: Part; label: string; api: string }[] = [
  { part: "curl", label: "Curl pattern & frizz", api: "YouCam Hair Type + Hair Frizziness Detection · 3 angles" },
  { part: "length", label: "Length", api: "YouCam Hair Length Detection · front photo" },
  { part: "density", label: "Density", api: "YouCam Hair Density Detection · tipped-forward photo" },
];

export default function AnalysisProgress({ compact = false }: { compact?: boolean }) {
  const { progress, analyzing, measured } = useApp();
  if (!analyzing && !measured) return null;
  const done = ROWS.filter((r) => progress[r.part] === "done").length;
  return (
    <section aria-label="Hair measurement progress" className={`card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{analyzing ? "Measuring your hair…" : "Hair measured"}</p>
        <span className="text-sm text-muted" aria-live="polite">{done} of {ROWS.length} done</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-shell overflow-hidden" aria-hidden>
        <div className="h-full bg-teal transition-all duration-500" style={{ width: `${(done / ROWS.length) * 100}%` }} />
      </div>
      <ul className="mt-3 space-y-2.5">
        {ROWS.map((r) => {
          const st = progress[r.part];
          return (
            <li key={r.part} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                {st === "done" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-white text-[11px]">✓</span>
                ) : st === "error" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clay text-white text-[11px]">!</span>
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-teal/30 border-t-teal animate-spin" />
                )}
              </span>
              <span className="text-sm">
                <span className="font-medium">{r.label}</span>
                <span className="sr-only">: {st === "done" ? "done" : st === "error" ? "failed" : "in progress"}</span>
                {!compact && <span className="block text-xs text-muted">{r.api}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
