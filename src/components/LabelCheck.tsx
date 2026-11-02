"use client";
import { useRef, useState } from "react";
import { toJpeg } from "@/lib/client";
import { scoreProduct } from "@/lib/catalog";
import { TAG_INFO } from "@/lib/rules";
import type { Rec, Tag } from "@/lib/types";
import { Dots } from "./Quiz";

const EXAMPLE =
  "Water, Glycerin, Polyquaternium-11, Aloe Barbadensis Leaf Juice, Alcohol Denat., Panthenol, Hydrolyzed Wheat Protein, Phenoxyethanol, Fragrance";

type Parsed = { ingredients_text?: string; product_guess: string; weight: "light" | "medium" | "rich"; tags: { tag: Tag; ingredients: string[] }[] };

export default function LabelCheck({ rec }: { rec: Rec }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<(Parsed & ReturnType<typeof scoreProduct>) | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function run(body: object) {
    setBusy(true);
    setErr("");
    setRes(null);
    try {
      const r = await fetch("/api/label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not check this label");
      const p = j as Parsed;
      if (p.ingredients_text) setText(p.ingredients_text);
      setRes({ ...p, ...scoreProduct({ tags: p.tags.map((t) => t.tag), weight: p.weight }, rec) });
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }
  const check = () => run({ ingredients: text });

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
      const blob = await toJpeg(img, 1600);
      const data: string = await new Promise((ok) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.readAsDataURL(blob);
      });
      setPhoto(url);
      setText("");
      await run({ image: data });
    } catch {
      setErr("Couldn't open that photo. Try a JPG or PNG.");
    }
    if (file.current) file.current.value = "";
  }

  const verdict = res ? (res.match >= 70 ? ["Good fit", "bg-teal-soft text-teal-dark"] : res.match >= 45 ? ["Okay, with caveats", "bg-amber-soft text-amber"] : ["Skip it", "bg-clay-soft text-clay"]) : null;

  return (
    <div className="card p-5 flex flex-col md:col-span-2 lg:col-span-1 border-teal/40">
      <p className="eyebrow">Already own one? · Gemini + rules</p>
      <p className="mt-1 font-medium">Check any label against your hair</p>
      <p className="mt-1 text-sm text-muted">In a shop? Photograph the ingredient list on the back of the bottle.</p>
      <input ref={file} type="file" accept="image/*" capture="environment" className="sr-only" id="label-photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
      <label htmlFor="label-photo" className={`btn-primary mt-3 cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        Scan a label with your camera
      </label>
      {photo && (
        <div className="mt-3 flex items-center gap-3 text-xs text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Your label photo" className="h-14 w-14 rounded-lg object-cover border border-line" />
          {busy ? <span className="inline-flex items-center gap-2"><Dots /> Reading the ingredients…</span> : <span>Read from your photo — check the text below and edit if needed.</span>}
        </div>
      )}
      <p className="mt-4 text-xs font-medium text-muted">…or paste the ingredient list</p>
      <textarea
        aria-label="Ingredient list"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Paste the ingredient list from the bottle…"
        className="mt-3 w-full rounded-xl border border-line bg-white p-3 text-sm outline-none focus:border-teal"
      />
      <div className="mt-2 flex items-center gap-2">
        <button className="btn-ghost !py-1.5" onClick={check} disabled={busy || text.trim().length < 8}>{busy ? <Dots /> : "Check"}</button>
        <button className="text-xs text-muted hover:text-ink" onClick={() => setText(EXAMPLE)}>use an example</button>
      </div>
      {err && <p className="mt-2 text-sm text-clay" role="alert">{err}</p>}
      {res && verdict && (
        <div className="mt-4" role="status">
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
