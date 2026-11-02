"use client";
// The embeddable widget UI. Runs inside an iframe that public/widget.js adds to a store's page.
// Protocol (window.postMessage, origin-checked):
//   iframe → store:  strandlab:ready {hasProfile} · strandlab:result {WidgetResult} · strandlab:scores {items} · strandlab:close
//   store → iframe:  strandlab:open {product} · strandlab:score {items}
//   popup  → iframe: strandlab:profile {profile}   (from /connect, same origin as this iframe)
import { useCallback, useEffect, useRef, useState } from "react";
import { Choice, CURLS, DENSITY, FRIZZ, LENGTHS, selfMeasured, Strand } from "@/components/SelfReport";
import { Logo } from "@/components/Shell";
import { Dots } from "@/components/Quiz";
import { TYPE_MAPPINGS } from "@/lib/rules";
import { classifyInci } from "@/lib/inci";
import type { Porosity, Profile } from "@/lib/types";
import { PROFILE_KEY, summarize, type ParsedLabel, type WidgetProduct, type WidgetResult } from "@/lib/widget";

type Saved = { profile: Profile; source: WidgetResult["profile"]["source"] };
type View = "intro" | "quick" | "result";

const POROSITY: { v: Porosity; label: string; sub: string }[] = [
  { v: "high", label: "Soaks in fast", sub: "Wets fast, dries fast" },
  { v: "normal", label: "In between", sub: "Not sure / average" },
  { v: "low", label: "Beads on top", sub: "Takes ages to wet & dry" },
];
const SAMPLES = ["maya", "lena", "zola"];

/** Products are scored in the browser with the deterministic INCI classifier: instant, free per page view,
 *  identical for the badge and the dialog, and never rate-limited. */
function parse(ingredients: string, name?: string): Promise<ParsedLabel> {
  const r = classifyInci(ingredients, name);
  if (!r.tags.length && ingredients.trim().length < 8) return Promise.reject(new Error("This product has no ingredient list"));
  return Promise.resolve(r);
}

export default function WidgetPage() {
  const parentOrigin = useRef<string | null>(null);
  const [product, setProduct] = useState<WidgetProduct | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [view, setView] = useState<View>("intro");
  const [result, setResult] = useState<WidgetResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const savedRef = useRef<Saved | null>(null);
  savedRef.current = saved;

  const post = useCallback((msg: object) => {
    if (window.parent !== window) window.parent.postMessage(msg, parentOrigin.current || "*");
  }, []);

  /** Score the current product (if any) for a profile, show it, and send it to the store. */
  const compute = useCallback(
    async (s: Saved, prod: WidgetProduct | null) => {
      setErr("");
      setView("result");
      setBusy(true);
      try {
        const parsed = prod?.ingredients ? await parse(prod.ingredients, prod.name) : undefined;
        const r = summarize(s.profile, s.source, prod || undefined, parsed);
        setResult(r);
        post({ type: "strandlab:result", result: r });
      } catch (e) {
        setErr((e as Error).message);
        const r = summarize(s.profile, s.source);
        setResult(r);
        post({ type: "strandlab:result", result: r });
      }
      setBusy(false);
    },
    [post],
  );

  const applyProfile = useCallback(
    (s: Saved) => {
      setSaved(s);
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(s));
      } catch {
        /* partitioned / blocked storage: works for this visit */
      }
      compute(s, productRef.current);
    },
    [compute],
  );
  const productRef = useRef<WidgetProduct | null>(null);
  productRef.current = product;

  useEffect(() => {
    let s: Saved | null = null;
    try {
      s = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    } catch {
      /* ignore */
    }
    if (s?.profile?.measured) setSaved(s);

    async function onMsg(e: MessageEvent) {
      const d = e.data || {};
      // From the /connect popup (same origin as this iframe).
      if (e.origin === window.location.origin && d.type === "strandlab:profile" && d.profile?.measured) {
        applyProfile({ profile: d.profile, source: d.profile.measured.source === "self" ? "self-reported" : "measured" });
        return;
      }
      if (e.source !== window.parent) return;
      parentOrigin.current = e.origin;
      if (d.type === "strandlab:open") {
        const p: WidgetProduct | null = d.product && (d.product.ingredients || d.product.name) ? d.product : null;
        setProduct(p);
        productRef.current = p;
        setResult(null);
        if (savedRef.current) compute(savedRef.current, p);
        else setView("intro");
      }
      if (d.type === "strandlab:score" && Array.isArray(d.items) && savedRef.current) {
        const s = savedRef.current;
        const items: WidgetProduct[] = d.items.slice(0, 40);
        // Score a store's product grid, 3 at a time; each badge is sent as soon as it's ready.
        let i = 0;
        const worker = async () => {
          while (i < items.length) {
            const it = items[i++];
            if (!it.ingredients) continue;
            try {
              const r = summarize(s.profile, s.source, it, await parse(it.ingredients, it.name));
              post({ type: "strandlab:scores", items: [{ id: it.id, match: r.product!.match, verdict: r.product!.verdict, label: r.product!.verdictLabel }] });
            } catch {
              /* skip this product */
            }
          }
        };
        await Promise.all([worker(), worker(), worker()]);
      }
    }
    window.addEventListener("message", onMsg);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && window.parent.postMessage({ type: "strandlab:close" }, parentOrigin.current || "*");
    window.addEventListener("keydown", onKey);
    // Tell the store we're ready (it replies with the product, and the origin we should answer to).
    window.parent.postMessage({ type: "strandlab:ready", hasProfile: !!s?.profile?.measured }, "*");
    return () => {
      window.removeEventListener("message", onMsg);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickSample(id: string) {
    setBusy(true);
    try {
      const d = await (await fetch(`/samples/${id}/data.json`)).json();
      applyProfile({ profile: { measured: d.measured, porosity: d.porosity, climate: d.climate }, source: "sample" });
    } catch {
      setErr("Couldn't load the sample.");
      setBusy(false);
    }
  }

  function openConnect() {
    const w = 480,
      h = 760;
    const win = window.open(`/connect`, "strandlab-connect", `width=${w},height=${h},left=${Math.max(0, (screen.width - w) / 2)},top=${Math.max(0, (screen.height - h) / 3)}`);
    if (!win) setErr("Your browser blocked the pop-up. Allow pop-ups for this site, or use the quick check.");
  }

  const close = () => post({ type: "strandlab:close" });

  return (
    <div className="min-h-screen bg-paper flex flex-col text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Logo className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight">StrandLab hair match</p>
            {product?.name && <p className="truncate text-xs text-muted">for {product.name}</p>}
          </div>
        </div>
        <button onClick={close} className="btn-ghost !p-2" aria-label="Close hair match">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <div className="flex-1 px-4 py-5">
        {view === "intro" && (
          <div>
            <h1 className="font-serif text-2xl leading-tight">{product ? "Does this suit your hair?" : "Find products for your hair"}</h1>
            <p className="mt-2 text-sm text-ink/75">
              StrandLab checks {product ? "this product's ingredients" : "ingredients"} against your curl pattern, frizz, density and porosity — and explains why.
            </p>
            <div className="mt-5 space-y-2.5">
              <button onClick={() => setView("quick")} className="w-full card p-4 text-left hover:border-teal">
                <span className="block font-semibold">Quick check · 5 questions</span>
                <span className="block text-sm text-muted">About 30 seconds, no photos</span>
              </button>
              <button onClick={openConnect} className="w-full card p-4 text-left hover:border-teal">
                <span className="block font-semibold">Use my StrandLab scan</span>
                <span className="block text-sm text-muted">AI-measured with YouCam Hair AI · opens StrandLab in a small window</span>
              </button>
            </div>
            <p className="mt-6 text-xs font-medium text-muted">Just looking? Try a sample profile:</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SAMPLES.map((id) => (
                <button key={id} onClick={() => pickSample(id)} disabled={busy} className="rounded-xl border border-line bg-white p-2 text-center hover:border-teal">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/samples/${id}/front.jpg`} alt="" className="mx-auto h-10 w-10 rounded-lg object-cover object-top" />
                  <span className="mt-1 block text-xs font-medium capitalize">{id}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === "quick" && <Quick onBack={() => setView("intro")} onDone={(profile) => applyProfile({ profile, source: "self-reported" })} />}

        {view === "result" && (
          <div aria-live="polite">
            {busy && (
              <p className="flex items-center gap-2 text-sm text-muted"><Dots /> Checking {product?.name || "your profile"}…</p>
            )}
            {err && <p className="mb-3 rounded-xl bg-clay-soft p-3 text-sm text-clay" role="alert">{err}</p>}
            {result && !busy && <ResultView r={result} onChange={() => { setView("intro"); setResult(null); }} />}
          </div>
        )}
      </div>

      <footer className="border-t border-line bg-white px-4 py-3 text-[11px] text-muted">
        {view === "result" && result ? (
          <div className="flex items-center justify-between gap-2">
            <span>Shared with this store: hair type &amp; match score. Never photos.</span>
            <button onClick={close} className="btn-primary !py-1.5 !text-xs shrink-0">Done</button>
          </div>
        ) : (
          <span>
            Powered by <a href="/" target="_blank" rel="noopener noreferrer" className="underline">StrandLab</a> · YouCam Hair AI · Cosmetic guidance only
          </span>
        )}
      </footer>
    </div>
  );
}

function ResultView({ r, onChange }: { r: WidgetResult; onChange: () => void }) {
  const p = r.product;
  const tone = p ? (p.verdict === "great" ? "bg-teal-soft text-teal-dark border-teal/40" : p.verdict === "ok" ? "bg-amber-soft text-ink border-amber/40" : "bg-clay-soft text-clay border-clay/40") : "";
  return (
    <div className="space-y-4">
      {p && (
        <div className={`rounded-2xl border p-4 ${tone}`}>
          <p className="text-xs font-semibold uppercase tracking-wider">{p.verdictLabel}</p>
          <p className="mt-1 font-serif text-4xl">{p.match}% <span className="text-base font-sans">match for your hair</span></p>
          <ul className="mt-3 space-y-1 text-sm">
            {p.pros.slice(0, 3).map((x) => <li key={x} className="text-teal-dark">✓ {x}</li>)}
            {p.cons.slice(0, 3).map((x) => <li key={x} className="text-clay">✕ {x}</li>)}
          </ul>
        </div>
      )}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Your hair profile</p>
          <button onClick={onChange} className="text-xs text-teal underline">Change</button>
        </div>
        <p className="mt-1 text-sm text-ink/80">
          {r.profile.curlPattern ?? "?"} · frizz {r.profile.frizz ?? "?"}/3 · {r.profile.density ?? "?"} · {r.profile.porosity} porosity
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {r.profile.source === "measured" ? "Measured with YouCam Hair AI" : r.profile.source === "sample" ? "Sample profile" : "Self-reported — the StrandLab photo scan is more precise"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold text-teal-dark">Look for</p>
            <ul className="mt-1 space-y-0.5">{r.lookFor.slice(0, 4).map((x) => <li key={x}>✓ {x}</li>)}</ul>
          </div>
          <div>
            <p className="font-semibold text-clay">Avoid</p>
            <ul className="mt-1 space-y-0.5">{r.avoid.slice(0, 4).map((x) => <li key={x}>✕ {x}</li>)}</ul>
          </div>
        </div>
      </div>
      <a href="/samples" target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-teal underline">
        See the full routine on StrandLab ↗
      </a>
    </div>
  );
}

function Quick({ onBack, onDone }: { onBack: () => void; onDone: (p: Profile) => void }) {
  const [curl, setCurl] = useState<number | null>(null);
  const [frizz, setFrizz] = useState<number | null>(null);
  const [dens, setDens] = useState<number | null>(null);
  const [len, setLen] = useState<number | null>(null);
  const [por, setPor] = useState<Porosity | null>(null);
  const ready = [curl, frizz, dens, len, por].every((x) => x !== null);
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-muted hover:text-ink">← Back</button>
      <fieldset>
        <legend className="font-medium">1. Your hair when it dries naturally</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CURLS.map((c, i) => (
            <Choice key={c.label} selected={curl === i} onClick={() => setCurl(i)} label={c.label} sub={TYPE_MAPPINGS[c.idx].toUpperCase()}>
              <Strand amp={c.amp} freq={c.freq} />
            </Choice>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-medium">2. Frizz on a normal day</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">{FRIZZ.map((f, i) => <Choice key={f.label} selected={frizz === i} onClick={() => setFrizz(i)} label={f.label} sub={f.sub} />)}</div>
      </fieldset>
      <fieldset>
        <legend className="font-medium">3. How easily can you see your scalp?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">{DENSITY.map((d, i) => <Choice key={d.label} selected={dens === i} onClick={() => setDens(i)} label={d.label} sub={d.sub} />)}</div>
      </fieldset>
      <fieldset>
        <legend className="font-medium">4. Length</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">{LENGTHS.map((l, i) => <Choice key={l.label} selected={len === i} onClick={() => setLen(i)} label={l.label} sub={l.sub} />)}</div>
      </fieldset>
      <fieldset>
        <legend className="font-medium">5. When you wash it, water…</legend>
        <div className="mt-2 grid grid-cols-1 gap-2">{POROSITY.map((p) => <Choice key={p.v} selected={por === p.v} onClick={() => setPor(p.v)} label={p.label} sub={p.sub} />)}</div>
      </fieldset>
      <button disabled={!ready} onClick={() => onDone({ measured: selfMeasured(curl!, frizz!, dens!, len!), porosity: por!, climate: null })} className="btn-primary w-full !py-3">
        {ready ? "See my match →" : `${[curl, frizz, dens, len, por].filter((x) => x !== null).length} of 5 answered`}
      </button>
    </div>
  );
}

