"use client";
// Display settings: text size and high contrast, remembered on this device.
import { useEffect, useRef, useState } from "react";
import { DISPLAY_KEY as KEY } from "@/lib/display";
export const SIZES = [
  { v: 100, label: "Default" },
  { v: 115, label: "Large" },
  { v: 130, label: "Larger" },
];
type Prefs = { size: number; hc: boolean };

function read(): Prefs {
  try {
    return { size: 100, hc: false, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { size: 100, hc: false };
  }
}

function apply(p: Prefs) {
  const d = document.documentElement;
  d.style.fontSize = p.size === 100 ? "" : `${p.size}%`;
  d.classList.toggle("hc", p.hc);
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked: settings last for this visit */
  }
}

export function useDisplay() {
  const [p, setP] = useState<Prefs>({ size: 100, hc: false });
  useEffect(() => setP(read()), []);
  const update = (n: Partial<Prefs>) => {
    const next = { ...p, ...n };
    setP(next);
    apply(next);
  };
  return { prefs: p, update };
}

/** The settings controls themselves (used in the header popover and the mobile menu). */
export function DisplayPanel() {
  const { prefs, update } = useDisplay();
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold">Text size</legend>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-shell p-1">
          {SIZES.map((s, i) => (
            <label key={s.v} className={`cursor-pointer rounded-lg px-2 py-2 text-center ${prefs.size === s.v ? "bg-white shadow-sm font-semibold text-ink" : "text-muted hover:text-ink"}`}>
              <input type="radio" name="sl-size" className="sr-only" checked={prefs.size === s.v} onChange={() => update({ size: s.v })} />
              <span aria-hidden className="block font-serif leading-none" style={{ fontSize: `${15 + i * 4}px` }}>A</span>
              <span className="mt-1 block text-[11px]">{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold">High contrast</span>
          <span className="block text-xs text-muted">Black text, darker borders, underlined links</span>
        </span>
        <span className="relative inline-flex">
          <input type="checkbox" role="switch" className="peer sr-only" checked={prefs.hc} onChange={(e) => update({ hc: e.target.checked })} />
          <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-teal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal" />
          <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </label>
    </div>
  );
}

/** "Aa" header button with a popover. */
export function DisplayButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div className={`relative ${className}`} ref={box}>
      <button onClick={() => setOpen(!open)} className="btn-ghost h-10 !px-3" aria-expanded={open} aria-controls="display-settings" aria-label="Display settings: text size and contrast" title="Text size & contrast">
        <span aria-hidden className="font-serif text-base leading-none">A<span className="text-[0.7em]">a</span></span>
      </button>
      {open && (
        <div id="display-settings" role="dialog" aria-label="Display settings" className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-line bg-white p-4 shadow-card">
          <DisplayPanel />
        </div>
      )}
    </div>
  );
}
