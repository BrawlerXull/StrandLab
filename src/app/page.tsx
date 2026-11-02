"use client";
import Link from "next/link";
import { useApp } from "@/components/AppState";
import { ChatIcon } from "@/components/Shell";
import { SampleGrid, SampleStrip } from "@/components/SamplePicker";
import StoreShowcase from "@/components/StoreShowcase";

export default function Landing() {
  const { openCoach, measured } = useApp();

  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-16 pb-12 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div>
          <Link href="#for-stores" className="group inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber-soft py-1 pl-1 pr-3 text-sm hover:border-amber">
            <span className="rounded-full bg-amber px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">New</span>
            <span>Stores can embed StrandLab with one line of code</span>
            <span aria-hidden className="text-amber transition group-hover:translate-x-0.5">→</span>
          </Link>
          <p className="mt-3 chip text-teal-dark border-teal/30 bg-teal-soft">AI hair-care advisor · free · no account</p>
          <h1 className="mt-5 font-serif text-4xl sm:text-6xl leading-[1.05] tracking-tight">
            Stop guessing your hair type. <em className="text-teal">Measure it.</em>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink/80">
            <b>StrandLab</b> reads your curl pattern, frizz, density and length from four selfies, then tells you exactly which
            ingredients and products suit your hair — and which ones to skip.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/scan" className="btn-primary !px-6 !py-3 !text-base">Start free scan →</Link>
            <Link href="/samples" className="btn-ghost !px-6 !py-3 !text-base">View sample results</Link>
          </div>
          <p className="mt-3 text-sm text-muted">
            Rather not share photos? <Link href="/quick" className="text-teal underline font-medium">Answer 4 questions instead</Link> — no camera needed.
          </p>
          <div className="mt-6 rounded-2xl border border-teal/25 bg-white/70 p-3 sm:p-4">
            <SampleStrip label="No photos? Open a real result instantly:" />
          </div>
          <ul className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-muted" aria-label="Highlights">
            <li className="flex items-center gap-2"><Tick /> ~2 minutes</li>
            <li className="flex items-center gap-2"><Tick /> 4 photos</li>
            <li className="flex items-center gap-2"><Tick /> Explained advice</li>
            <li className="flex items-center gap-2"><Tick /> Photos not stored</li>
          </ul>
          {measured && (
            <p className="mt-5 text-sm">
              You have a scan in progress. <Link href="/results" className="text-teal underline">Open my results</Link>
            </p>
          )}
        </div>
        <HeroVisual />
      </section>

      {/* FOR STORES: live widget */}
      <StoreShowcase />

      {/* WHO / PROBLEM */}
      <section className="border-y border-line bg-white/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <p className="eyebrow">Who it&apos;s for</p>
            <h2 className="h2 mt-2">Curly, wavy, coily and frizz-prone hair</h2>
          </div>
          <div className="md:col-span-2 grid sm:grid-cols-3 gap-4">
            <Problem title="Labels assume you know your type" text="“For 3B curls”, “for fine hair”, “high porosity” — most people guess, and guess wrong." />
            <Problem title="The same product acts differently" text="Glycerin defines curls on a mild day and causes frizz on a humid or freezing one." />
            <Problem title="Ad photos set false expectations" text="So people abandon products that were working, and buy the next one." />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 scroll-mt-20">
        <p className="eyebrow">How it works</p>
        <h2 className="h2 mt-2">Three steps, about two minutes</h2>
        <ol className="mt-8 grid md:grid-cols-3 gap-4">
          <Step n={1} title="Take 4 photos" time="~1 min" text="Front, left, right, and one with your head tipped forward. The camera guide and auto-framing do the rest." api="YouCam Hair Type · Frizziness · Density · Length Detection" />
          <Step n={2} title="Answer 4 quick questions" time="~30 sec" text="A porosity check (how your hair absorbs water), plus your city for today's dew point." api="Open-Meteo live weather" />
          <Step n={3} title="Get your personal plan" time="instant" text="Your hair profile, ingredients to look for and avoid — each with the reason — a routine, matched products, and a realistic preview." api="StrandLab rule engine · YouCam Hair VTO · Gemini" />
        </ol>
      </section>

      {/* WHAT YOU GET */}
      <section className="bg-white/60 border-y border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <p className="eyebrow">What you get</p>
          <h2 className="h2 mt-2">Everything explained, nothing hidden</h2>
          <p className="mt-2 text-ink/75">Curious how the advice is made? <Link href="/learn" className="text-teal underline">Read the hair science and the full rule table</Link>.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Feature icon="◎" title="Hair profile" text="Curl pattern, frizz, density and length — measured by AI, shown on simple scales." />
            <Feature icon="✓" title="Ingredients, with reasons" text="“Avoid glycerin today: dew point is 22°C.” Every tip names the measurement behind it." />
            <Feature icon="≡" title="Wash-day routine" text="Step-by-step routine sized to your hair: light, medium or rich products." />
            <Feature icon="◇" title="Matched products" text="A ranked starter kit, local shop links, and a label checker — just photograph the back of any bottle." />
            <Feature icon="◐" title="Realistic preview" text="See the realistic result on your own photo next to what the ads promise." />
            <Feature icon="?" title="Hair coach" text="Ask by typing or voice, in your own language (17 supported) — it knows your results and can read answers aloud." action={<button onClick={() => openCoach()} className="mt-3 text-sm text-teal font-medium hover:underline inline-flex items-center gap-1.5"><ChatIcon /> Try the coach now</button>} />
          </div>
        </div>
      </section>

      {/* SAMPLES */}
      <section id="samples" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 scroll-mt-20">
        <p className="eyebrow">Sample results</p>
        <h2 className="h2 mt-2">Explore a full result before you scan</h2>
        <p className="mt-2 text-muted max-w-2xl">These people are AI-generated; their measurements are real YouCam Hair AI results.</p>
        <div className="mt-8"><SampleGrid /></div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 py-12 scroll-mt-20">
        <p className="eyebrow">FAQ</p>
        <h2 className="h2 mt-2">Questions</h2>
        <div className="mt-6 divide-y divide-line card">
          <Faq q="Is it free? Do I need an account?" a="Yes, it's free and there's no account. Your last results stay in this browser tab only." />
          <Faq q="What happens to my photos?" a="They're sent to YouCam's Hair AI for measurement and are not stored by StrandLab. A small copy of your front photo stays in your browser for this session so you can revisit results." />
          <Faq q="Why four photos?" a="Curl pattern and frizz are measured from three angles (front, left, right). Density is read from your parting, so one photo has your head tipped forward." />
          <Faq q="What is porosity?" a="How easily your hair absorbs and holds water. It changes which ingredients work — and a camera can't see it, so we ask four quick questions." />
          <Faq q="Why does the weather matter?" a="Humectants like glycerin pull water from the air. In very humid air hair swells and frizzes; in very dry air they pull water out of your hair. The dew point tells us which." />
          <Faq q="Are the products real?" a="The shortlist uses a fictional demo catalogue to show how matching works. Use the label checker to test any real product you own." />
          <Faq q="Is this medical advice?" a="No. StrandLab gives cosmetic guidance. For hair loss, scalp pain or sudden shedding, see a dermatologist." />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-8">
        <div className="rounded-3xl bg-teal text-white px-6 py-10 sm:px-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="font-serif text-3xl">Know your hair in two minutes.</h2>
            <p className="mt-1 text-white/80">Four photos, four questions, one clear plan.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/scan" className="btn bg-white text-teal-dark hover:bg-paper !px-6 !py-3">Start free scan</Link>
            <button onClick={() => openCoach()} className="btn border border-white/50 hover:bg-white/10 !px-6 !py-3"><ChatIcon /> Ask the coach</button>
          </div>
        </div>
      </section>
    </>
  );
}

function Tick() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4 text-teal shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M4 10.5l4 4 8-9" /></svg>;
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/samples/maya/front.jpg" alt="" className="aspect-[4/5] w-full object-cover object-top" />
      </div>
      <div className="absolute -left-3 sm:-left-8 top-8 card px-4 py-3">
        <p className="eyebrow">Curl pattern</p>
        <p className="font-serif text-2xl">3B–3C</p>
      </div>
      <div className="absolute -right-3 sm:-right-6 top-32 card px-4 py-3">
        <p className="eyebrow">Frizz</p>
        <p className="font-serif text-2xl">2 / 3</p>
      </div>
      <div className="absolute left-4 right-4 -bottom-6 card px-4 py-3 text-sm">
        <p className="text-clay font-medium">✕ Avoid glycerin today</p>
        <p className="text-muted text-xs">22°C dew point — humid air makes it swell and frizz</p>
      </div>
    </div>
  );
}

function Problem({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}

function Step({ n, title, time, text, api }: { n: number; title: string; time: string; text: string; api: string }) {
  return (
    <li className="card p-6">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-white font-medium">{n}</span>
        <span className="chip">{time}</span>
      </div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-ink/75">{text}</p>
      <p className="mt-3 receipt">{api}</p>
    </li>
  );
}

function Feature({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal-dark text-lg" aria-hidden>{icon}</span>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-ink/75">{text}</p>
      {action}
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
        {q}
        <span className="text-teal transition group-open:rotate-45 text-xl leading-none" aria-hidden>+</span>
      </summary>
      <p className="mt-2 text-sm text-ink/75">{a}</p>
    </details>
  );
}
