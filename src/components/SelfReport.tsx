"use client";
// Self-report questions shared by the no-photo route (/quick) and the store widget (/widget).
import { familyOf, TYPE_MAPPINGS } from "@/lib/rules";
import type { Measured } from "@/lib/types";

export const CURLS = [
  { idx: 0, label: "Straight", sub: "Lies flat, no bend", amp: 0, freq: 1 },
  { idx: 1, label: "Loose waves", sub: "Soft, gentle S-bend", amp: 4, freq: 1.5 },
  { idx: 2, label: "Defined waves", sub: "Clear S-shape from mid-length", amp: 7, freq: 2 },
  { idx: 4, label: "Loose curls", sub: "Springy loops, marker-size", amp: 9, freq: 3 },
  { idx: 5, label: "Tight curls", sub: "Ringlets, pencil-size", amp: 9, freq: 4.5 },
  { idx: 7, label: "Coils", sub: "Tight coils or zig-zags", amp: 8, freq: 7 },
];
export const FRIZZ = [
  { v: 0, label: "Smooth", sub: "Sleek, few flyaways", term: "Smooth" },
  { v: 1, label: "A little", sub: "Light halo on humid days", term: "Slightly Frizzy" },
  { v: 2, label: "Noticeable", sub: "Frizz most days", term: "Frizzy" },
  { v: 3, label: "Very frizzy", sub: "Puffy, hard to define", term: "Very Frizzy" },
];
export const DENSITY = [
  { v: 0.8, label: "Easily", sub: "Scalp shows through", term: "Low Density" },
  { v: 1.6, label: "Somewhat", sub: "A little at the parting", term: "Medium Density" },
  { v: 2.4, label: "Barely", sub: "Hard to find scalp", term: "High Density" },
  { v: 2.9, label: "Not at all", sub: "Very thick hair", term: "Very High Density" },
];
export const LENGTHS = [
  { label: "Short", sub: "Above the ears", term: "short hair", band: "short" as const },
  { label: "Chin to shoulder", sub: "Bob or lob", term: "shoulder length", band: "medium" as const },
  { label: "Past shoulders", sub: "Above the chest", term: "above chest", band: "medium" as const },
  { label: "Long", sub: "Chest or longer", term: "long hair", band: "long" as const },
];

/** A strand drawn with the chosen curl tightness. */
export function Strand({ amp, freq }: { amp: number; freq: number }) {
  const pts = Array.from({ length: 41 }, (_, i) => {
    const y = 4 + i * 1.8;
    const x = 20 + Math.sin((i / 40) * Math.PI * 2 * freq) * amp * (0.4 + (i / 40) * 0.6);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 40 80" className="h-16 w-8" aria-hidden>
      <path d={pts} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Choice({ selected, onClick, label, sub, children }: { selected: boolean; onClick: () => void; label: string; sub: string; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? "border-teal bg-teal-soft ring-1 ring-teal" : "border-line bg-white hover:bg-shell"}`}
    >
      {children && <span className={selected ? "text-teal-dark" : "text-ink/70"}>{children}</span>}
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </button>
  );
}

/** Build a self-reported Measured from option indexes. */
export function selfMeasured(curl: number, frizz: number, dens: number, len: number): Measured {
  const c = CURLS[curl],
    f = FRIZZ[frizz],
    d = DENSITY[dens],
    l = LENGTHS[len];
  return {
    type: { mapping: TYPE_MAPPINGS[c.idx], term: c.label, index: c.idx, family: familyOf(c.idx) },
    frizz: { level: f.v, term: f.term },
    density: { value: d.v, term: d.term },
    length: { term: l.term, band: l.band },
    issues: [],
    framing: {},
    trace: [],
    source: "self",
  };
}
