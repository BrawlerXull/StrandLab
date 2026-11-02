"use client";
// Copy / print the personal plan as a shopping list.
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/catalog";
import { TAG_INFO } from "@/lib/rules";
import type { Profile, Rec, ScoredProduct, Tag } from "@/lib/types";

export function planText(rec: Rec, shop: Record<string, ScoredProduct[]>, profile: Profile, title: string) {
  const m = profile.measured;
  const tags = Object.values(rec.tags) as Rec["tags"][Tag][];
  const seek = tags.filter((t) => t.score > 0).sort((a, b) => b.score - a.score).map((t) => `  + ${TAG_INFO[t.tag].label} (${TAG_INFO[t.tag].examples})`);
  const avoid = tags.filter((t) => t.score < 0).sort((a, b) => a.score - b.score).map((t) => `  - ${TAG_INFO[t.tag].label} (${TAG_INFO[t.tag].examples})`);
  const kit = CATEGORIES.map((c) => shop[c][0]).filter((p) => p.match >= 50).map((p) => `  • ${p.category}: ${p.name} — ${p.match}% match`);
  return [
    `StrandLab plan — ${title}`,
    `Hair: ${m.type?.mapping.toUpperCase() ?? "?"} (${m.type?.term ?? "not measured"}), frizz ${m.frizz?.level ?? "?"}/3, density ${m.density?.term ?? "?"}, ${m.length?.term ?? ""}`,
    `Porosity: ${profile.porosity}${profile.climate ? ` · ${profile.climate.place} dew point ${Math.round(profile.climate.dewPointC)}°C` : ""}`,
    `Routine: ${rec.headline}`,
    "",
    "LOOK FOR on labels:", ...seek,
    "",
    "AVOID on labels:", ...avoid,
    "",
    "Wash day:", ...rec.routine.map((r, i) => `  ${i + 1}. ${r.step} — ${r.detail}`),
    "",
    "Starter kit (demo catalogue):", ...kit,
  ].join("\n");
}

export default function ShopTools({ rec, shop, profile, title }: { rec: Rec; shop: Record<string, ScoredProduct[]>; profile: Profile; title: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(planText(rec, shop, profile, title));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 print:hidden">
      <button onClick={copy} className="btn-ghost !py-2">{copied ? "✓ Copied" : "Copy my shopping list"}</button>
      <button onClick={() => window.print()} className="btn-ghost !py-2">Print / save as PDF</button>
      <ShareButton rec={rec} shop={shop} profile={profile} title={title} className="btn-ghost !py-2" />
      <span role="status" className="sr-only">{copied ? "Shopping list copied to clipboard" : ""}</span>
    </div>
  );
}

const SITE = "https://strandlab-youcam.vercel.app";

/** Share the plan: native share sheet on phones, otherwise WhatsApp / email / copy. */
export function ShareButton({ rec, shop, profile, title, className = "btn-ghost" }: { rec: Rec; shop: Record<string, ScoredProduct[]>; profile: Profile; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
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

  const text = () => `${planText(rec, shop, profile, title)}\n\nMade with StrandLab: ${SITE}`;
  async function share() {
    const t = text();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My StrandLab hair plan", text: t });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    setOpen((o) => !o);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(text());
      setMsg("Plan copied — paste it anywhere");
    } catch {
      setMsg("Copy blocked by the browser");
    }
    setTimeout(() => setMsg(""), 2500);
  }
  return (
    <div className="relative print:hidden" ref={box}>
      <button onClick={share} className={className} aria-haspopup="menu" aria-expanded={open}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" /></svg>
        Share my plan
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-60 rounded-2xl border border-line bg-white p-1.5 shadow-card">
          <a role="menuitem" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-shell" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text())}`} onClick={() => setOpen(false)}>Send on WhatsApp</a>
          <a role="menuitem" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-shell" href={`mailto:?subject=${encodeURIComponent("My StrandLab hair plan")}&body=${encodeURIComponent(text())}`} onClick={() => setOpen(false)}>Send by email</a>
          <button role="menuitem" className="block w-full text-left rounded-xl px-3 py-2.5 text-sm hover:bg-shell" onClick={() => { copy(); setOpen(false); }}>Copy as text</button>
        </div>
      )}
      <span role="status" className={msg ? "absolute right-0 mt-2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs text-paper" : "sr-only"}>{msg}</span>
    </div>
  );
}
