"use client";
import { useState } from "react";
import { climateFor, geocode, reverseName } from "@/lib/client";
import type { Climate, Porosity } from "@/lib/types";
import { FlowNav } from "./Shell";

const QS: { q: string; a: [string, number][] }[] = [
  { q: "Sprinkle water on dry hair. It…", a: [["Beads up and sits on top", -1], ["Soaks in after a moment", 0], ["Soaks in instantly", 1]] },
  { q: "After washing, air-drying takes…", a: [["Hours — it stays damp", -1], ["About an hour or two", 0], ["Under an hour, it's dry fast", 1]] },
  { q: "Products on your hair usually…", a: [["Leave residue / feel greasy", -1], ["Absorb fine", 0], ["Vanish, hair still feels dry", 1]] },
  { q: "Bleach, colour or regular heat styling?", a: [["Never", -1], ["Some, occasionally", 0], ["Yes, often", 1]] },
];

export function porosityFrom(answers: (number | null)[]): Porosity {
  const s = answers.reduce<number>((a, b) => a + (b ?? 0), 0);
  return s <= -2 ? "low" : s >= 2 ? "high" : "normal";
}

export default function Quiz({ answers, setAnswers, climate, setClimate, onDone, onBack, analyzing, waiting }: {
  answers: (number | null)[];
  setAnswers: (a: (number | null)[]) => void;
  climate: Climate | null;
  setClimate: (c: Climate | null) => void;
  onDone: () => void;
  onBack: () => void;
  analyzing: boolean;
  waiting?: boolean;
}) {
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const done = answers.every((a) => a !== null);

  async function useLocation() {
    setErr("");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: la, longitude: lo } = pos.coords;
          setClimate(await climateFor(la, lo, await reverseName(la, lo)));
        } catch {
          setErr("Weather lookup failed — try a city name.");
        }
        setBusy(false);
      },
      () => {
        setErr("Location blocked — type your city instead.");
        setBusy(false);
      },
      { timeout: 8000 },
    );
  }
  async function useCity(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim()) return;
    setErr("");
    setBusy(true);
    try {
      const g = await geocode(city.trim());
      if (!g) setErr("City not found.");
      else setClimate(await climateFor(g.lat, g.lon, g.place));
    } catch {
      setErr("Weather lookup failed.");
    }
    setBusy(false);
  }

  return (
    <>
    <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-8">
      <h1 className="h2">Two things a camera can&apos;t see</h1>
      <p className="mt-2 max-w-2xl text-ink/75">
        <b>Porosity</b> is how easily your hair absorbs water — it changes which products work. <b>Your weather</b> decides whether ingredients like glycerin help or cause frizz today.
      </p>
      <div role="status" className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${analyzing ? "bg-teal-soft text-teal-dark" : "bg-shell"}`}>
        {analyzing ? <><Dots /> Measuring your hair with YouCam AI in the background…</> : <>✓ Hair measurements ready</>}
      </div>

      <div className="mt-8 grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="card p-5 sm:p-6">
          <h2 className="font-medium text-lg">1. Porosity check <span className="text-sm font-normal text-muted">· 4 questions</span></h2>
          <div className="mt-4 space-y-5">
            {QS.map((q, i) => (
              <fieldset key={i}>
                <legend className="text-sm font-medium">{q.q}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.a.map(([label, v]) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={answers[i] === v}
                      onClick={() => setAnswers(answers.map((x, j) => (j === i ? v : x)))}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${answers[i] === v ? "border-teal bg-teal-soft text-teal-dark" : "border-line bg-white hover:bg-shell"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          {done && <p className="mt-5 receipt">→ porosity: <b className="text-ink">{porosityFrom(answers)}</b></p>}
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="font-medium text-lg">2. Your weather <span className="text-sm font-normal text-muted">· optional</span></h2>
          <p className="mt-1 text-sm text-muted">Live from Open-Meteo. Under 4°C, glycerin pulls water out of hair; over 15°C it pulls humidity in.</p>
          <div className="mt-4 flex flex-col gap-3">
            <button className="btn-ghost" onClick={useLocation} disabled={busy}>Use my location</button>
            <form onSubmit={useCity} className="flex gap-2">
              <label htmlFor="city" className="sr-only">City</label>
              <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="or type a city" className="flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm outline-none focus:border-teal" />
              <button className="btn-ghost" disabled={busy}>Go</button>
            </form>
            {err && <p className="text-sm text-clay">{err}</p>}
            {climate && <ClimateBadge c={climate} />}
            {!climate && <p className="receipt">Optional — skip and we&apos;ll assume a mild climate.</p>}
          </div>
        </div>
      </div>

    </section>
    <FlowNav
      back={onBack}
      backLabel="Photos"
      next={onDone}
      nextDisabled={!done || waiting}
      nextLabel={waiting ? "Finishing analysis…" : "See my results →"}
      hint={!done ? `Answer all 4 porosity questions (${answers.filter((a) => a !== null).length}/4)` : analyzing ? "Results open as soon as the AI finishes." : "Ready."}
    />
    </>
  );
}

export function ClimateBadge({ c }: { c: Climate }) {
  const tone = c.band === "humid" ? "bg-amber-soft text-amber" : c.band === "dry" ? "bg-teal-soft text-teal-dark" : "bg-shell text-ink";
  return (
    <div className={`rounded-xl px-4 py-3 ${tone}`}>
      <p className="text-sm font-medium">{c.place}</p>
      <p className="font-serif text-3xl">{Math.round(c.dewPointC)}°C <span className="text-base font-sans">dew point · {c.band}</span></p>
      <p className="receipt">humidity {Math.round(c.humidity)}% · next 3 days {Math.round(c.dewMin3d)}–{Math.round(c.dewMax3d)}°C</p>
    </div>
  );
}

export function Dots() {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="strand-dot inline-block h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
