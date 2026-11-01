import type { Metadata } from "next";
import Link from "next/link";
import { TAG_INFO } from "@/lib/rules";
import type { Tag } from "@/lib/types";

export const metadata: Metadata = { title: "Hair science · StrandLab", description: "How StrandLab turns curl pattern, frizz, density, length, porosity and dew point into ingredient advice." };

const SECTIONS = [
  {
    id: "curl",
    title: "Curl pattern (1–4, a–c)",
    measured: "YouCam Hair Type Detection · front, left and right photos",
    body: "The widely used 1–4 scale goes from straight (1) through wavy (2) and curly (3) to coily (4); letters a–c run from looser to tighter. YouCam returns one of nine ranges such as “3A to 3B”. Every bend is a point where the cuticle lifts and natural scalp oil travels less easily, so tighter patterns tend to be drier and tangle more — they need more slip and moisture, while waves are easily weighed down.",
  },
  {
    id: "frizz",
    title: "Frizz (0–3)",
    measured: "YouCam Hair Frizziness Detection · three angles",
    body: "Frizz is strands whose cuticle is raised so they swell with water from the air and break away from the curl clump. It is driven by dryness, friction and humidity. What helps: a film-forming styler that sets undisturbed, gentle cleansing, and avoiding drying alcohols high on the label.",
  },
  {
    id: "density",
    title: "Density (0–3)",
    measured: "YouCam Hair Density Detection · tipped-forward photo showing the parting",
    body: "Density is how many strands you have, not how thick each one is. Low-density hair looks flat under rich butters and heavy oils; high-density hair can carry richer creams and needs more slip to detangle in reasonable time.",
  },
  {
    id: "length",
    title: "Length",
    measured: "YouCam Hair Length Detection · front photo",
    body: "Longer hair has older ends that have been through more washing, brushing and sun. Those ends need the most slip and a little oil to limit splits.",
  },
  {
    id: "porosity",
    title: "Porosity — what a camera can't see",
    measured: "Four-question quiz (water test, drying time, product absorption, chemical history)",
    body: "Porosity is how easily water gets into the hair and how quickly it leaves. Low-porosity cuticles lie flat: products sit on top and build up, so light humectants and warmth work better than butters. High-porosity hair (often from bleach or heat) absorbs fast and loses fast: protein and ceramides patch gaps and an oil seals moisture in.",
  },
  {
    id: "dew",
    title: "Dew point and humectants",
    measured: "Live Open-Meteo forecast for your location",
    body: "Humectants like glycerin pull water toward themselves. The dew point (how much water is actually in the air) decides which way: StrandLab treats under 4°C as dry air — glycerin draws water out of the hair, causing frizz — and over 15°C as humid air, where it pulls in so much that hair swells. In between, humectants help. This is why the same gel works one week and fails the next, and why StrandLab plans your routine per day.",
  },
];

const RULES: [string, string, string][] = [
  ["Curl pattern straight / wavy", "Avoid rich butters, heavy oils · seek hold (gel/mousse)", "Waves are weighed down; hold makes them clump"],
  ["Curl pattern curly / coily", "Seek fatty alcohols, gentle cleansers · avoid sulfates", "Slip prevents breakage; curls rely on natural oils"],
  ["Coily (4A–4C)", "Seek butters and a sealing oil", "Coils lose moisture fastest (LCO method)"],
  ["Density < 1.5", "Avoid butters, heavy oils, silicone build-up · seek protein", "Low-density hair looks sparse under heavy products"],
  ["Frizz ≥ 2", "Avoid drying alcohols, sulfates · seek film-formers", "Keep the cuticle down and the cast undisturbed"],
  ["Porosity low", "Seek humectants, light oils · avoid butters, protein overload", "Products can't get past a flat cuticle"],
  ["Porosity high", "Seek protein, ceramides, sealing oil", "Patch gaps, then seal"],
  ["Dew point > 15°C", "Avoid humectants · seek anti-humidity film-formers", "Glycerin pulls in excess water → swelling"],
  ["Dew point < 4°C", "Avoid humectants · seek emollients and oils", "Glycerin pulls water out of the hair"],
  ["Long hair", "Seek slip and oil on the ends", "Oldest, most worn part of the hair"],
];

export default function Learn() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      <p className="eyebrow">Hair science</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">How StrandLab thinks about your hair</h1>
      <p className="mt-3 text-lg text-ink/75 max-w-2xl">
        Four measurements from YouCam Hair AI, two things a camera can&apos;t see, and a transparent rule table. No black box — here is exactly how
        advice is made. Cosmetic guidance, based on widely used stylist and curly-hair-care practice.
      </p>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="chip hover:bg-shell">{s.title.split(" (")[0].split(" —")[0]}</a>)}
        <a href="#ingredients" className="chip hover:bg-shell">Ingredients</a>
        <a href="#rules" className="chip hover:bg-shell">Rule table</a>
      </nav>

      <div className="mt-10 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="card p-6 scroll-mt-24">
            <h2 className="font-serif text-2xl">{s.title}</h2>
            <p className="mt-1 text-xs font-medium text-teal-dark">Measured with: {s.measured}</p>
            <p className="mt-3 leading-relaxed text-ink/85">{s.body}</p>
          </section>
        ))}
      </div>

      <section id="ingredients" className="mt-12 scroll-mt-24">
        <h2 className="h2">The 14 ingredient families</h2>
        <p className="mt-2 text-ink/75">Every product and every label you paste is mapped to these families, then scored against your profile.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(Object.keys(TAG_INFO) as Tag[]).map((t) => (
            <div key={t} className="rounded-xl border border-line bg-white px-4 py-3">
              <p className="font-medium">{TAG_INFO[t].label}</p>
              <p className="text-sm text-muted">On labels: {TAG_INFO[t].examples}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="rules" className="mt-12 scroll-mt-24">
        <h2 className="h2">The rule table</h2>
        <p className="mt-2 text-ink/75">Each matching rule adds or subtracts points for an ingredient family, and the reason is shown next to every recommendation in your results.</p>
        <div className="mt-5 overflow-x-auto card">
          <table className="w-full text-sm">
            <caption className="sr-only">StrandLab rules</caption>
            <thead>
              <tr className="text-left border-b border-line bg-shell/50">
                <th scope="col" className="px-4 py-3 font-medium">When we measure…</th>
                <th scope="col" className="px-4 py-3 font-medium">We recommend</th>
                <th scope="col" className="px-4 py-3 font-medium">Because</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map(([w, r, b]) => (
                <tr key={w} className="border-b border-line/60 align-top">
                  <td className="px-4 py-3 font-medium">{w}</td>
                  <td className="px-4 py-3">{r}</td>
                  <td className="px-4 py-3 text-ink/75">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/scan" className="btn-primary">Measure my hair</Link>
        <Link href="/samples/maya" className="btn-ghost">See a sample result</Link>
      </div>
    </div>
  );
}
