"use client";
import { useState } from "react";
import { scoreProduct } from "@/lib/catalog";
import { TAG_INFO } from "@/lib/rules";
import type { Rec, Tag } from "@/lib/types";
import { Dots } from "./Quiz";

const EXAMPLE =
  "Water, Glycerin, Polyquaternium-11, Aloe Barbadensis Leaf Juice, Alcohol Denat., Panthenol, Hydrolyzed Wheat Protein, Phenoxyethanol, Fragrance";

type Parsed = { product_guess: string; weight: "light" | "medium" | "rich"; tags: { tag: Tag; ingredients: string[] }[] };

export default function LabelCheck({ rec }: { rec: Rec }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<(Parsed & ReturnType<typeof scoreProduct>) | null>(null);

  async function check() {
    setBusy(true);
    setErr("");
    setRes(null);
    try {
      const r = await fetch("/api/label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ingredients: text }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const p = j as Parsed;
      setRes({ ...p, ...scoreProduct({ tags: p.tags.map((t) => t.tag), weight: p.weight }, rec) });
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  const verdict = res ? (res.match >= 70 ? ["Good fit", "bg-teal-soft text-teal-dark"] : res.match >= 45 ? ["Okay, with caveats", "bg-amber-soft text-amber"] : ["Skip it", "bg-clay-soft text-clay"]) : null;

  return (
    <div className="card p-5 flex flex-col md:col-span-2 lg:col-span-1 border-teal/40">
      <p className="eyebrow">Already own one? · Gemini + rules</p>
      <p className="mt-1 font-medium">Check any label against your hair</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Paste the ingredient list from the bottle…"
        className="mt-3 w-full rounded-xl border border-line bg-white p-3 text-sm outline-none focus:border-teal"
      />
      <div className="mt-2 flex items-center gap-2">
        <button className="btn-primary !py-1.5" onClick={check} disabled={busy || text.trim().length < 8}>{busy ? <Dots /> : "Check"}</button>
        <button className="text-xs text-muted hover:text-ink" onClick={() => setText(EXAMPLE)}>use an example</button>
      </div>
      {err && <p className="mt-2 text-sm text-clay">{err}</p>}
      {res && verdict && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${verdict[1]}`}>{verdict[0]} · {res.match}%</span>
            <span className="text-xs text-muted">{res.product_guess} · {res.weight}</span>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs">
            {res.pros.map((x) => <li key={x} className="text-teal-dark">✓ {x}</li>)}
            {res.cons.map((x) => <li key={x} className="text-clay">✕ {x}</li>)}
          </ul>
          <p className="mt-2 receipt">detected: {res.tags.map((t) => `${TAG_INFO[t.tag].label} (${t.ingredients.join(", ")})`).join(" · ") || "nothing relevant"}</p>
        </div>
      )}
    </div>
  );
}
