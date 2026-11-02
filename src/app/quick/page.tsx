"use client";
// No-photo route: for people who can't or don't want to share selfies (privacy, no camera, head covering).
// Self-reported answers stand in for the YouCam measurements; the rest of the plan works the same and is
// clearly labelled as lower confidence.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Quiz from "@/components/Quiz";
import { useApp } from "@/components/AppState";
import { FlowNav } from "@/components/Shell";
import { familyOf, TYPE_MAPPINGS } from "@/lib/rules";
import type { Measured } from "@/lib/types";

const CURLS = [
  { idx: 0, label: "Straight", sub: "Lies flat, no bend", amp: 0, freq: 1 },
  { idx: 1, label: "Loose waves", sub: "Soft, gentle S-bend", amp: 4, freq: 1.5 },
  { idx: 2, label: "Defined waves", sub: "Clear S-shape from mid-length", amp: 7, freq: 2 },
  { idx: 4, label: "Loose curls", sub: "Springy loops, marker-size", amp: 9, freq: 3 },
  { idx: 5, label: "Tight curls", sub: "Ringlets, pencil-size", amp: 9, freq: 4.5 },
  { idx: 7, label: "Coils", sub: "Tight coils or zig-zags", amp: 8, freq: 7 },
];
const FRIZZ = [
  { v: 0, label: "Smooth", sub: "Sleek, few flyaways", term: "Smooth" },
  { v: 1, label: "A little", sub: "Light halo on humid days", term: "Slightly Frizzy" },
  { v: 2, label: "Noticeable", sub: "Frizz most days", term: "Frizzy" },
  { v: 3, label: "Very frizzy", sub: "Puffy, hard to define", term: "Very Frizzy" },
];
const DENSITY = [
  { v: 0.8, label: "Easily", sub: "Scalp shows through", term: "Low Density" },
  { v: 1.6, label: "Somewhat", sub: "A little at the parting", term: "Medium Density" },
  { v: 2.4, label: "Barely", sub: "Hard to find scalp", term: "High Density" },
  { v: 2.9, label: "Not at all", sub: "Very thick hair", term: "Very High Density" },
];
const LENGTHS = [
  { label: "Short", sub: "Above the ears", term: "short hair", band: "short" as const },
  { label: "Chin to shoulder", sub: "Bob or lob", term: "shoulder length", band: "medium" as const },
  { label: "Past shoulders", sub: "Above the chest", term: "above chest", band: "medium" as const },
  { label: "Long", sub: "Chest or longer", term: "long hair", band: "long" as const },
];

/** A strand drawn with the chosen curl tightness. */
function Strand({ amp, freq }: { amp: number; freq: number }) {
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

function Choice({ selected, onClick, label, sub, children }: { selected: boolean; onClick: () => void; label: string; sub: string; children?: React.ReactNode }) {
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

export default function QuickPage() {
  const router = useRouter();
  const { answers, setAnswers, climate, setClimate, setSelfMeasured } = useApp();
  const [step, setStep] = useState<0 | 1>(0);
  const [curl, setCurl] = useState<number | null>(null);
  const [frizz, setFrizz] = useState<number | null>(null);
  const [dens, setDens] = useState<number | null>(null);
  const [len, setLen] = useState<number | null>(null);
  const answered = [curl, frizz, dens, len].filter((x) => x !== null).length;

  function finish() {
    const c = CURLS[curl!],
      f = FRIZZ[frizz!],
      d = DENSITY[dens!],
      l = LENGTHS[len!];
    const m: Measured = {
      type: { mapping: TYPE_MAPPINGS[c.idx], term: c.label, index: c.idx, family: familyOf(c.idx) },
      frizz: { level: f.v, term: f.term },
      density: { value: d.v, term: d.term },
      length: { term: l.term, band: l.band },
      issues: [],
      framing: {},
      trace: [],
      source: "self",
    };
    setSelfMeasured(m);
    router.push("/results");
  }

  const Progress = (
    <nav aria-label="No-photo check progress" className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
      <p className="text-sm text-muted">
        <span className="chip mr-2">No-photo check</span> Step {step + 1} of 2 · {step === 0 ? "Your hair" : "Porosity & weather"}
      </p>
    </nav>
  );

  if (step === 1)
    return (
      <>
        {Progress}
        <Quiz
          answers={answers}
          setAnswers={setAnswers}
          climate={climate}
          setClimate={setClimate}
          analyzing={false}
          status={<p className="text-sm text-muted">Your hair answers are saved. Two more things and your plan is ready.</p>}
          backLabel="Your hair"
          onBack={() => setStep(0)}
          onDone={finish}
        />
      </>
    );

  return (
    <>
      {Progress}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        <h1 className="h2">Tell us about your hair</h1>
        <p className="mt-2 max-w-2xl text-ink/75">
          No camera, no photos stored — just four quick picks. Answers are less precise than the AI measurement, so your plan will be
          marked as <b>self-reported</b>. You can take the <Link href="/scan" className="text-teal underline">4-photo scan</Link> any time.
        </p>

        <div className="mt-8 space-y-8">
          <fieldset>
            <legend className="font-medium text-lg">1. Which looks most like your hair when it dries naturally?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CURLS.map((c, i) => (
                <Choice key={c.label} selected={curl === i} onClick={() => setCurl(i)} label={c.label} sub={`${c.sub} · ${TYPE_MAPPINGS[c.idx].toUpperCase()}`}>
                  <Strand amp={c.amp} freq={c.freq} />
                </Choice>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium text-lg">2. How frizzy is it on a normal day?</legend>
            <div className="mt-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
              {FRIZZ.map((f, i) => <Choice key={f.label} selected={frizz === i} onClick={() => setFrizz(i)} label={f.label} sub={f.sub} />)}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium text-lg">3. When you part your hair, how easily can you see your scalp?</legend>
            <div className="mt-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
              {DENSITY.map((d, i) => <Choice key={d.label} selected={dens === i} onClick={() => setDens(i)} label={d.label} sub={d.sub} />)}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium text-lg">4. How long is it?</legend>
            <div className="mt-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
              {LENGTHS.map((l, i) => <Choice key={l.label} selected={len === i} onClick={() => setLen(i)} label={l.label} sub={l.sub} />)}
            </div>
          </fieldset>
        </div>
      </section>
      <FlowNav
        back={() => router.push("/")}
        backLabel="Home"
        next={() => {
          setStep(1);
          window.scrollTo({ top: 0 });
        }}
        nextDisabled={answered < 4}
        nextLabel={answered < 4 ? `${answered} of 4 answered` : "Next: porosity →"}
        hint={answered < 4 ? "Pick one option in each group." : "Ready."}
      />
    </>
  );
}
