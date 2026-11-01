"use client";
// Copy / print the personal plan as a shopping list.
import { useState } from "react";
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
      <span role="status" className="sr-only">{copied ? "Shopping list copied to clipboard" : ""}</span>
    </div>
  );
}
