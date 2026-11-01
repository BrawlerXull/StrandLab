"use client";
import { useEffect, useRef, useState } from "react";
import Capture, { type CapturedPhoto } from "@/components/Capture";
import Quiz, { Dots, porosityFrom } from "@/components/Quiz";
import Results from "@/components/Results";
import type { Climate, Measured, Porosity, Profile, Shot } from "@/lib/types";
import { SHOTS } from "@/lib/types";

type Sample = {
  id: string;
  name: string;
  blurb: string;
  measured: Measured;
  porosity: Porosity;
  climate: Climate | null;
  previews: Record<string, string>;
};
type Hist = { date: string; frizz: number | null; density: number | null; type: string | null };

const SAMPLE_IDS = ["maya", "lena", "zola"];
const HKEY = "strandlab.history";

export default function Home() {
  const [step, setStep] = useState<"home" | "capture" | "quiz" | "results">("home");
  const [photos, setPhotos] = useState<Partial<Record<Shot, CapturedPhoto>>>({});
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null, null]);
  const [climate, setClimate] = useState<Climate | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sample, setSample] = useState<Sample | null>(null);
  const [history, setHistory] = useState<Hist[]>([]);
  const runId = useRef(0);

  useEffect(() => {
    Promise.all(SAMPLE_IDS.map((id) => fetch(`/samples/${id}/data.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null))).then((s) =>
      setSamples(s.filter(Boolean) as Sample[]),
    );
    try {
      setHistory(JSON.parse(localStorage.getItem(HKEY) || "[]"));
    } catch {
      /* private mode */
    }
  }, []);

  const go = (s: typeof step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  async function analyze() {
    const id = ++runId.current;
    setAnalyzing(true);
    setMeasured(null);
    setError("");
    go("quiz");
    try {
      const fd = new FormData();
      SHOTS.forEach((s) => fd.append(s, photos[s]!.blob, `${s}.jpg`));
      fd.append("boxes", JSON.stringify(Object.fromEntries(SHOTS.map((s) => [s, photos[s]!.box]))));
      const r = await fetch("/api/analyze", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Analysis failed");
      if (id !== runId.current) return;
      setMeasured(j.measured);
      const m = j.measured as Measured;
      if (m.type || m.frizz) {
        const h = [...history, { date: new Date().toISOString(), frizz: m.frizz?.level ?? null, density: m.density?.value ?? null, type: m.type?.mapping ?? null }].slice(-12);
        setHistory(h);
        try {
          localStorage.setItem(HKEY, JSON.stringify(h));
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      if (id === runId.current) setError((e as Error).message);
    }
    if (id === runId.current) setAnalyzing(false);
  }

  useEffect(() => {
    if (waiting && !analyzing) {
      setWaiting(false);
      if (measured) go("results");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, analyzing, measured]);

  function openSample(s: Sample) {
    setSample(s);
    go("results");
  }

  const profile: Profile | null = sample
    ? { measured: sample.measured, porosity: sample.porosity, climate: sample.climate }
    : measured
      ? { measured, porosity: porosityFrom(answers), climate }
      : null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-line/70 bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => { setSample(null); go("home"); }} className="flex items-center gap-2">
            <Logo />
            <span className="font-serif text-xl tracking-tight">StrandLab</span>
          </button>
          <span className="receipt hidden sm:block">powered by YouCam Hair AI</span>
        </div>
      </header>

      {step === "home" && (
        <>
          <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-10 grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
            <div>
              <p className="eyebrow">Hair diagnostics → hair-care shopping</p>
              <h1 className="mt-3 font-serif text-4xl sm:text-6xl leading-[1.05] tracking-tight">
                Your hair type, <em className="text-teal">measured.</em>
                <br />
                Then only what suits it.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted">
                Curly, wavy and frizz-prone shoppers guess at labels like 3A, &ldquo;fine&rdquo; or &ldquo;high porosity&rdquo; and buy product after product. StrandLab measures
                your curl pattern, frizz, density and length with YouCam Hair AI, adds your porosity and today&apos;s dew point, and tells you which ingredients to look
                for — and which to skip.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="btn-primary !px-6 !py-3" onClick={() => go("capture")}>Scan my hair (4 photos)</button>
                <a href="#samples" className="btn-ghost !px-6 !py-3">Try a sample</a>
              </div>
              <p className="mt-4 receipt">Photos are sent to YouCam for analysis and are not stored by StrandLab.</p>
            </div>
            <HowItWorks />
          </section>

          <section id="samples" className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
            <p className="eyebrow">Sample profiles · AI-generated people, real YouCam results</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {samples.map((s) => (
                <button key={s.id} onClick={() => openSample(s)} className="card overflow-hidden text-left hover:-translate-y-0.5 transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/samples/${s.id}/front.jpg`} alt={s.name} className="aspect-[4/3] w-full object-cover object-top" />
                  <div className="p-4">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted">{s.blurb}</p>
                    <p className="mt-2 receipt">
                      {s.measured.type?.mapping.toUpperCase()} · frizz {s.measured.frizz?.level}/3 · {s.measured.density?.term}
                    </p>
                  </div>
                </button>
              ))}
              {samples.length === 0 && <p className="text-sm text-muted">Samples loading…</p>}
            </div>
          </section>
        </>
      )}

      {step === "capture" && (
        <Capture photos={photos} setPhoto={(s, p) => setPhotos((x) => ({ ...x, [s]: p ?? undefined }))} onDone={analyze} onBack={() => go("home")} />
      )}

      {step === "quiz" && (
        <>
          <Quiz answers={answers} setAnswers={setAnswers} climate={climate} setClimate={setClimate} analyzing={analyzing} onDone={() => (analyzing ? setWaiting(true) : measured ? go("results") : null)} />
          {waiting && (
            <p className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4 text-sm text-teal inline-flex items-center gap-2"><Dots /> Waiting for YouCam to finish…</p>
          )}
          {error && (
            <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-10">
              <div className="rounded-xl border border-clay/40 bg-clay-soft p-4 text-sm">
                <p className="font-medium text-clay">Analysis failed</p>
                <p className="mt-1">{error}</p>
                <div className="mt-3 flex gap-2">
                  <button className="btn-ghost !py-1.5" onClick={analyze}>Retry</button>
                  <button className="btn-ghost !py-1.5" onClick={() => go("capture")}>Retake photos</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {step === "results" && profile && (
        <Results
          key={sample?.id || "live"}
          profile={profile}
          frontUrl={sample ? `/samples/${sample.id}/front.jpg` : photos.front!.url}
          frontBlob={sample ? null : photos.front!.blob}
          samplePreviews={sample ? Object.fromEntries(Object.entries(sample.previews).map(([k, v]) => [k, `/samples/${sample.id}/${v}`])) : undefined}
          history={sample ? [] : history}
          onRestart={() => { setSample(null); setPhotos({}); setMeasured(null); setAnswers([null, null, null, null]); go("home"); }}
          onRetake={() => { if (sample) { setSample(null); } go("capture"); }}
        />
      )}
    </main>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#2F6B66" />
      <path d="M9 23c3-4 1-8 4-11s6-1 7-4M13 25c3-4 1-8 4-11s6-1 7-4" stroke="#F6F3EE" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function HowItWorks() {
  const steps = [
    ["4 photos", "front · left · right · parting", "Hair Type, Frizziness, Density & Length Detection"],
    ["2 things a camera can't see", "porosity quiz · live dew point", "Open-Meteo weather"],
    ["Explainable rules", "every ingredient score cites a measurement", "StrandLab rule engine"],
    ["Shop, check, preview", "ranked kit · label checker · realistic vs ad look", "Hair Volume / Wavy Hair VTO · Gemini"],
  ];
  return (
    <ol className="card p-6 space-y-5">
      {steps.map(([t, d, api], i) => (
        <li key={t} className="flex gap-4">
          <span className="font-mono text-sm text-teal mt-0.5">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <p className="font-medium">{t}</p>
            <p className="text-sm text-muted">{d}</p>
            <p className="receipt mt-0.5">{api}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
