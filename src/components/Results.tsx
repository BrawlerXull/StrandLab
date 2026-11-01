"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, shopQuery, shopUrl, shortlist } from "@/lib/catalog";
import { recommend, TAG_INFO, TYPE_MAPPINGS } from "@/lib/rules";
import type { Profile, Rec, ScoredProduct, Tag } from "@/lib/types";
import { useApp, type Hist } from "./AppState";
import { ClimateBadge } from "./Quiz";
import LabelCheck from "./LabelCheck";
import Preview from "./Preview";
import TracePanel from "./TracePanel";
import { Outlook, ProgressTracker } from "./Insights";
import ShopTools from "./ShopTools";
import { ChatIcon } from "./Shell";
import { Sparkle } from "./Coach";

export function contextFor(p: Profile, rec: Rec) {
  const m = p.measured;
  const tags = Object.values(rec.tags) as Rec["tags"][Tag][];
  const seek = tags.filter((t) => t.score > 0).map((t) => `${TAG_INFO[t.tag].label} (+${t.score}): ${t.why.join("; ")}`);
  const avoid = tags.filter((t) => t.score < 0).map((t) => `${TAG_INFO[t.tag].label} (${t.score}): ${t.why.join("; ")}`);
  return [
    `Curl pattern: ${m.type ? `${m.type.mapping} (${m.type.term})` : "not measured"}`,
    `Frizz: ${m.frizz ? `${m.frizz.level}/3 ${m.frizz.term}` : "not measured"}`,
    `Density: ${m.density ? `${m.density.value.toFixed(2)}/3 ${m.density.term}` : "not measured"}`,
    `Length: ${m.length?.term ?? "not measured"}`,
    `Porosity (quiz): ${p.porosity}`,
    `Climate: ${p.climate ? `${p.climate.place}, dew point ${Math.round(p.climate.dewPointC)}°C (${p.climate.band}), next 3 days ${Math.round(p.climate.dewMin3d)}–${Math.round(p.climate.dewMax3d)}°C` : "unknown"}`,
    `Routine weight: ${rec.weight}. Headline: ${rec.headline}`,
    `SEEK: ${seek.join(" | ")}`,
    `AVOID: ${avoid.join(" | ")}`,
    `ROUTINE: ${rec.routine.map((r) => `${r.step}: ${r.detail}`).join(" | ")}`,
  ].join("\n");
}

const TABS = [
  { id: "overview", label: "Overview", caption: "Your profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
  { id: "ingredients", label: "Ingredients", caption: "Seek & avoid", icon: "M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 9V3M7.5 15h9" },
  { id: "routine", label: "Routine", caption: "Step by step", icon: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" },
  { id: "products", label: "Products", caption: "Matched kit", icon: "M6 7h12l-1 13H7L6 7zM9 7V5a3 3 0 0 1 6 0v2" },
  { id: "preview", label: "Preview", caption: "See it on you", icon: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
] as const;

/** What "Explain this section" asks the coach for each tab. */
const EXPLAIN: Record<string, { label: string; q: string }> = {
  overview: { label: "Explain my overview", q: "Explain my overview in simple terms: what do my measurements mean together, and what is the single most important thing for me to change?" },
  ingredients: { label: "Explain my ingredients", q: "Walk me through my ingredients section: which 2–3 matter most for my hair, why, and how do I spot them on a label in a shop?" },
  routine: { label: "Explain my routine", q: "Explain my wash-day routine step by step in plain words, and tell me which step makes the biggest difference for my hair." },
  products: { label: "Explain my product matches", q: "How should I use my product matches: what is the minimum starter kit I need, what can wait, and what should I look for if I buy a different brand?" },
  preview: { label: "Explain my preview", q: "What can I realistically expect from this routine compared to the ad photo, and roughly how long until I notice a difference?" },
};
type TabId = (typeof TABS)[number]["id"];

export default function Results({ title, sampleName, profile, frontUrl, frontBlob, samplePreviews, history, retakeHref, editDetailsHref, onRestart }: {
  title: string;
  sampleName?: string;
  profile: Profile;
  frontUrl: string;
  frontBlob: Blob | null;
  samplePreviews?: Record<string, string>;
  history: Hist[];
  retakeHref?: string;
  editDetailsHref?: string;
  onRestart?: () => void;
}) {
  const { setCoachContext, openCoach } = useApp();
  const rec = useMemo(() => recommend(profile), [profile]);
  const shop = useMemo(() => shortlist(rec), [rec]);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    const h = window.location.hash.slice(1) as TabId;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);
  // Depend on the context *text* (a stable string), not on object identity, to avoid a render loop.
  const ctxText = contextFor(profile, rec);
  const ctxLabel = sampleName ? `${sampleName}'s sample profile` : "your measured hair profile";
  useEffect(() => {
    setCoachContext({ label: ctxLabel, text: ctxText });
  }, [ctxText, ctxLabel, setCoachContext]);
  useEffect(() => () => setCoachContext(null), [setCoachContext]);

  const go = (t: TabId) => {
    setTab(t);
    history_replace(t);
    document.getElementById("results-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const idx = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-24">
      <div id="results-top" className="scroll-mt-24 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{title}</p>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight mt-1">{rec.headline}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {editDetailsHref && <Link href={editDetailsHref} className="btn-ghost">Edit answers</Link>}
          {retakeHref && <Link href={retakeHref} className="btn-ghost">Retake photos</Link>}
          {onRestart && <Link href="/" onClick={onRestart} className="btn-ghost">Start over</Link>}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 sm:mx-0 mt-6 bg-paper/95 backdrop-blur py-2">
        <div
          role="tablist"
          aria-label="Result sections"
          className="flex md:grid md:grid-cols-5 gap-2 overflow-x-auto snap-x px-4 sm:px-0 md:rounded-2xl md:border md:border-line md:bg-white md:p-1.5 md:shadow-card [scrollbar-width:none]"
        >
          {TABS.map((t, i) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => go(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    const n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id;
                    go(n);
                    document.getElementById(`tab-${n}`)?.focus();
                  }
                }}
                className={`snap-start shrink-0 flex items-center gap-3 rounded-xl px-4 py-2.5 md:py-3 text-left transition border md:border-0 ${
                  active ? "bg-teal text-white border-teal shadow-md shadow-teal/20" : "bg-white md:bg-transparent border-line text-ink hover:bg-shell"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/15" : "bg-teal-soft text-teal-dark"}`} aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
                </span>
                <span className="leading-tight">
                  <span className="block text-[15px] font-semibold tracking-tight">{t.label}</span>
                  <span className={`block text-xs ${active ? "text-white/80" : "text-muted"}`}>
                    <span className="sr-only">Section {i + 1} of {TABS.length}: </span>{t.caption}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-8">
        {tab === "overview" && <Overview profile={profile} rec={rec} frontUrl={frontUrl} history={history} go={go} openCoach={openCoach} isSample={!!sampleName} />}
        {tab === "ingredients" && <Ingredients rec={rec} ask={openCoach} />}
        {tab === "routine" && <Routine rec={rec} ask={openCoach} profile={profile} />}
        {tab === "products" && <Products rec={rec} shop={shop} ask={openCoach} profile={profile} title={title} />}
        {tab === "preview" && (
          <Preview measured={profile.measured} frontUrl={frontUrl} frontBlob={frontBlob} samplePreviews={samplePreviews} action={<ExplainButton tab="preview" ask={openCoach} />} />
        )}
      </div>

      {/* Prev / next between sections */}
      <nav aria-label="Section navigation" className="mt-12 flex items-center justify-between gap-3 border-t border-line pt-6">
        {idx > 0 ? (
          <button className="btn-ghost" onClick={() => go(TABS[idx - 1].id)}>← {TABS[idx - 1].label}</button>
        ) : (
          <span />
        )}
        {idx < TABS.length - 1 ? (
          <button className="btn-primary" onClick={() => go(TABS[idx + 1].id)}>Next: {TABS[idx + 1].label} →</button>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

/** Section heading with an AI "explain this section" action aligned to the right. */
function SectionHead({ id, title, children, tab, ask }: { id: string; title: string; children?: React.ReactNode; tab: string; ask: (q?: string, l?: string) => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="max-w-3xl">
        <h2 id={id} className="h2">{title}</h2>
        {children && <div className="mt-2 text-ink/75">{children}</div>}
      </div>
      <ExplainButton tab={tab} ask={ask} />
    </div>
  );
}

export function ExplainButton({ tab, ask }: { tab: string; ask: (q?: string, l?: string) => void }) {
  const e = EXPLAIN[tab];
  return (
    <button
      onClick={() => ask(e.q, e.label)}
      className="shrink-0 self-start sm:self-auto inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal-soft px-4 py-2.5 text-sm font-semibold text-teal-dark hover:bg-teal hover:text-white transition"
    >
      <Sparkle /> Explain this section
    </button>
  );
}

/** Small inline "Ask why" link that sends a specific question to the coach. */
function AskWhy({ q, label, ask, text = "Ask why" }: { q: string; label: string; ask: (q?: string, l?: string) => void; text?: string }) {
  return (
    <button onClick={() => ask(q, label)} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-teal hover:bg-teal-soft" aria-label={`${text}: ${label}`}>
      <Sparkle className="h-3 w-3" /> {text}
    </button>
  );
}

function history_replace(t: string) {
  try {
    window.history.replaceState(null, "", `#${t}`);
  } catch {
    /* ignore */
  }
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ---------------- Overview ----------------
function Overview({ profile, rec, frontUrl, history, go, openCoach, isSample }: { profile: Profile; rec: Rec; frontUrl: string; history: Hist[]; go: (t: TabId) => void; openCoach: (q?: string, l?: string) => void; isSample: boolean }) {
  const m = profile.measured;
  const tags = Object.values(rec.tags) as Rec["tags"][Tag][];
  const topSeek = tags.filter((t) => t.score > 0).sort((a, b) => b.score - a.score)[0];
  const topAvoid = tags.filter((t) => t.score < 0).sort((a, b) => a.score - b.score)[0];
  const prev = history.length > 1 ? history[history.length - 2] : null;

  return (
    <div className="space-y-10">
      <SectionHead id="ov-title" title="Overview" tab="overview" ask={openCoach}>Your measurements and the three things that matter most.</SectionHead>
      {m.issues.length > 0 && (
        <div className="rounded-xl border border-amber/40 bg-amber-soft p-4 text-sm" role="alert">
          <p className="font-medium">Some measurements need a better photo</p>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            {m.issues.map((i) => (
              <li key={i.detector}><b>{i.detector}:</b> {i.hint}</li>
            ))}
          </ul>
          <Link href="/scan" className="mt-2 inline-block text-teal underline">Retake photos</Link>
        </div>
      )}

      {/* Key takeaways */}
      <section aria-labelledby="takeaways">
        <h2 id="takeaways" className="text-lg font-medium">Your 3 key takeaways</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <Takeaway tone="teal" label="Product weight" title={`Use ${rec.weight} products`} text={rec.weight === "light" ? "Rich creams and butters will weigh your hair down." : rec.weight === "rich" ? "Your hair can carry, and needs, richer creams." : "Medium textures balance moisture and bounce."} />
          {topSeek && <Takeaway tone="teal" label="Look for" title={TAG_INFO[topSeek.tag].label} text={topSeek.why[0]} />}
          {topAvoid && <Takeaway tone="clay" label="Avoid" title={TAG_INFO[topAvoid.tag].label} text={topAvoid.why[0]} />}
        </div>
      </section>

      {profile.climate && <Outlook climate={profile.climate} frizz={m.frizz?.level ?? 1} />}

      {/* Measurements */}
      <section aria-labelledby="measured">
        <div className="flex items-end justify-between gap-3">
          <h2 id="measured" className="text-lg font-medium">What we measured</h2>
          <p className="text-xs text-muted">Measured by YouCam Hair AI · porosity from your answers</p>
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frontUrl} alt="Front photo used for the analysis" className="aspect-[3/4] lg:aspect-auto lg:h-full w-full object-cover" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Curl pattern" value={m.type?.mapping.toUpperCase() ?? "Not measured"} sub={m.type?.term} explain="1 = straight, 2 = wavy, 3 = curly, 4 = coily. Letters a–c go from looser to tighter.">
              {m.type && <Scale steps={TYPE_MAPPINGS.length} at={m.type.index} labels={["1 straight", "2 wavy", "3 curly", "4 coily"]} />}
            </Stat>
            <Stat label="Frizz" value={m.frizz ? `${m.frizz.level} of 3` : "Not measured"} sub={m.frizz?.term} explain="How much the hair surface is raised and fly-away." delta={prev && prev.frizz !== null && m.frizz ? m.frizz.level - prev.frizz : null}>
              {m.frizz && <Meter v={m.frizz.level} max={3} tone="clay" lo="smooth" hi="very frizzy" />}
            </Stat>
            <Stat label="Density" value={m.density ? `${m.density.value.toFixed(1)} of 3` : "Not measured"} sub={m.density?.term} explain="How many strands you have — decides how much product your hair can carry.">
              {m.density && <Meter v={m.density.value} max={3} tone="teal" lo="sparse" hi="very thick" />}
            </Stat>
            <Stat label="Length" value={m.length ? cap(m.length.band) : "Not measured"} sub={m.length?.term} explain="Longer hair has older ends that need more slip and protection." />
            <Stat label="Porosity" value={cap(profile.porosity)} sub="from your answers" explain={profile.porosity === "low" ? "The cuticle lies flat, so products sit on top instead of soaking in." : profile.porosity === "high" ? "The cuticle is raised: absorbs fast, loses moisture fast." : "Absorbs and holds moisture well."} />
            {profile.climate ? <ClimateBadge c={profile.climate} /> : (
              <div className="card p-4 text-sm text-muted">No location given, so weather rules were skipped. <Link href="/scan/details" className="text-teal underline">Add your city</Link></div>
            )}
          </div>
        </div>
      </section>

      <ProgressTracker history={history} isSample={isSample} />

      {/* Explore */}
      <section aria-labelledby="explore">
        <h2 id="explore" className="text-lg font-medium">Explore your plan</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Explore title="Ingredients" text="What to look for and avoid, with the reason for each." onClick={() => go("ingredients")} />
          <Explore title="Routine" text={`${rec.routine.length} wash-day steps sized to your hair.`} onClick={() => go("routine")} />
          <Explore title="Products" text="Your ranked starter kit, plus a label checker." onClick={() => go("products")} />
          <Explore title="Preview" text="The realistic result vs the ad promise, on your photo." onClick={() => go("preview")} />
        </div>
        <button onClick={() => openCoach(EXPLAIN.overview.q, EXPLAIN.overview.label)} className="mt-4 w-full card p-5 text-left flex items-center gap-4 hover:border-teal">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-white"><ChatIcon className="h-5 w-5" /></span>
          <span>
            <span className="block font-medium">Not sure what this means? Ask the coach.</span>
            <span className="block text-sm text-muted">It knows your measurements and explains them in plain language.</span>
          </span>
          <span className="ml-auto text-teal" aria-hidden>→</span>
        </button>
      </section>

      <TracePanel measured={m} />
    </div>
  );
}

function Takeaway({ tone, label, title, text }: { tone: "teal" | "clay"; label: string; title: string; text: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${tone === "teal" ? "border-teal/30 bg-teal-soft/60" : "border-clay/30 bg-clay-soft/60"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${tone === "teal" ? "text-teal-dark" : "text-clay"}`}>{tone === "teal" ? "✓" : "✕"} {label}</p>
      <p className="mt-1 text-lg font-medium">{title}</p>
      <p className="mt-1 text-sm text-ink/75">{text}</p>
    </div>
  );
}

function Explore({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-5 text-left hover:border-teal group">
      <p className="font-medium">{title} <span className="text-teal group-hover:translate-x-0.5 inline-block transition" aria-hidden>→</span></p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </button>
  );
}

function Stat({ label, value, sub, children, delta, explain }: { label: string; value: string; sub?: string; children?: React.ReactNode; delta?: number | null; explain?: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-serif text-3xl">
        {value}
        {delta !== null && delta !== undefined && delta !== 0 && (
          <span className={`ml-2 text-sm font-sans ${delta < 0 ? "text-teal" : "text-clay"}`}>{delta < 0 ? `▼ ${-delta}` : `▲ ${delta}`} since last scan</span>
        )}
      </p>
      {sub && <p className="text-sm text-ink/75">{sub}</p>}
      {children && <div className="mt-3">{children}</div>}
      {explain && <p className="mt-3 text-xs text-muted">{explain}</p>}
    </div>
  );
}

function Meter({ v, max, tone, lo, hi }: { v: number; max: number; tone: "teal" | "clay"; lo: string; hi: string }) {
  return (
    <div>
      <div className="h-2 rounded-full bg-shell overflow-hidden" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={max} aria-label={`${v} of ${max}`}>
        <div className={`h-full rounded-full ${tone === "teal" ? "bg-teal" : "bg-clay"}`} style={{ width: `${Math.max(4, (v / max) * 100)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted"><span>{lo}</span><span>{hi}</span></div>
    </div>
  );
}

function Scale({ steps, at, labels }: { steps: number; at: number; labels: string[] }) {
  return (
    <div aria-hidden>
      <div className="flex gap-1">
        {Array.from({ length: steps }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i === at ? "bg-teal" : i < at ? "bg-teal/30" : "bg-shell"}`} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        {labels.map((l) => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}

// ---------------- Ingredients ----------------
function Ingredients({ rec, ask }: { rec: Rec; ask: (q?: string, l?: string) => void }) {
  const tags = Object.values(rec.tags) as Rec["tags"][Tag][];
  const seek = tags.filter((t) => t.score > 0).sort((a, b) => b.score - a.score);
  const avoid = tags.filter((t) => t.score < 0).sort((a, b) => a.score - b.score);
  return (
    <section aria-labelledby="ing-title">
      <SectionHead id="ing-title" title="Ingredients for your hair" tab="ingredients" ask={ask}>
        Every recommendation comes from one of your measurements, and the reason is listed underneath. Use this when reading any label.
      </SectionHead>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <TagList title="Look for" items={seek} tone="teal" ask={ask} />
        <TagList title="Avoid or limit" items={avoid} tone="clay" ask={ask} />
      </div>
    </section>
  );
}

function TagList({ title, items, tone, ask }: { title: string; items: Rec["tags"][Tag][]; tone: "teal" | "clay"; ask: (q?: string, l?: string) => void }) {
  return (
    <div className="card p-5">
      <h3 className={`font-medium text-lg ${tone === "teal" ? "text-teal-dark" : "text-clay"}`}>{tone === "teal" ? "✓" : "✕"} {title}</h3>
      {items.length === 0 && <p className="mt-2 text-sm text-muted">Nothing strongly indicated.</p>}
      <ul className="mt-3 divide-y divide-line">
        {items.map((t) => (
          <li key={t.tag} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{TAG_INFO[t.tag].label}</span>
              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${tone === "teal" ? "bg-teal-soft text-teal-dark" : "bg-clay-soft text-clay"}`}>
                {Math.abs(t.score) >= 3 ? "Strong" : Math.abs(t.score) === 2 ? "Moderate" : "Mild"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <p className="text-xs text-muted">On labels: {TAG_INFO[t.tag].examples}</p>
              <AskWhy
                ask={ask}
                label={`Why ${tone === "teal" ? "look for" : "avoid"} ${TAG_INFO[t.tag].label.toLowerCase()}?`}
                q={`Why should I ${tone === "teal" ? "look for" : "avoid"} ${TAG_INFO[t.tag].label} (${TAG_INFO[t.tag].examples}) for my hair? Give one practical label-reading tip.`}
              />
            </div>
            <ul className="mt-1.5 text-sm text-ink/80 space-y-0.5">
              {t.why.map((w) => <li key={w} className="flex gap-2"><span aria-hidden className="text-muted">•</span>{w}</li>)}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Routine ----------------
function Routine({ rec, ask, profile }: { rec: Rec; ask: (q?: string, l?: string) => void; profile: Profile }) {
  return (
    <section aria-labelledby="rt-title">
      <SectionHead id="rt-title" title="Your wash-day routine" tab="routine" ask={ask}>
        Use <b>{rec.weight}</b>-weight products. Follow the steps in order.
      </SectionHead>
      <ol className="mt-6 space-y-3">
        {rec.routine.map((r, i) => (
          <li key={r.step} className="card p-5 flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-white font-medium" aria-hidden>{i + 1}</span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-lg">{r.step}</h3>
                <AskWhy ask={ask} text="How do I do this?" label={`How do I do: ${r.step}?`} q={`Explain how to do the "${r.step}" step (${r.detail}) for my hair, with the common mistakes to avoid.`} />
              </div>
              <p className="mt-0.5">{r.detail}</p>
              <p className="mt-1 text-sm text-muted"><span className="font-medium text-ink/70">Why:</span> {r.why}</p>
            </div>
          </li>
        ))}
      </ol>
      {profile.climate?.days?.length ? <div className="mt-10"><Outlook climate={profile.climate} frizz={profile.measured.frizz?.level ?? 1} /></div> : null}
    </section>
  );
}

// ---------------- Products ----------------
function Products({ rec, shop, ask, profile, title }: { rec: Rec; shop: Record<string, ScoredProduct[]>; ask: (q?: string, l?: string) => void; profile: Profile; title: string }) {
  const fam = profile.measured.type?.family ?? "wavy";
  const kit = CATEGORIES.map((c) => shop[c][0]).filter((p) => p.match >= 50);
  const total = kit.reduce((a, p) => a + p.price, 0);
  return (
    <section aria-labelledby="pr-title">
      <SectionHead id="pr-title" title="Products matched to you" tab="products" ask={ask}>
        The best match in each category comes first. Expand any category to compare.
        <p className="mt-2 text-sm text-ink">Your starter kit: <b>{kit.length} products · ${total}</b></p>
      </SectionHead>
      <ShopTools rec={rec} shop={shop} profile={profile} title={title} />
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => <CategoryCard key={c} category={c} items={shop[c]} query={shopQuery(c, rec, fam)} />)}
        <LabelCheck rec={rec} />
      </div>
      <p className="mt-4 text-xs text-muted">The ranked cards use a demo catalogue of fictional products to show how matching works; “Shop real … like this” searches real retailers with the same rules. Match % is calculated from the ingredient rules.</p>
    </section>
  );
}

function CategoryCard({ category, items, query }: { category: string; items: ScoredProduct[]; query: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5 flex flex-col">
      <h3 className="eyebrow">{category}</h3>
      <ProductRow p={items[0]} best />
      {open && items.slice(1).map((p) => <ProductRow key={p.id} p={p} />)}
      {items.length > 1 && (
        <button className="mt-3 text-sm text-teal font-medium hover:underline self-start" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Show less" : `Compare ${items.length - 1} more`}
        </button>
      )}
      <a href={shopUrl(query)} target="_blank" rel="noopener noreferrer" className="mt-4 pt-3 border-t border-line text-sm font-medium text-teal hover:underline">
        Shop real {category} like this ↗<span className="block text-xs font-normal text-muted">Searches “{query}”</span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

function ProductRow({ p, best }: { p: ScoredProduct; best?: boolean }) {
  const good = p.match >= 70,
    bad = p.match < 45;
  return (
    <div className={`mt-3 ${best ? "" : "border-t border-line pt-3"}`}>
      <div className="flex items-start gap-3">
        <div className="h-12 w-9 shrink-0 rounded-md" style={{ background: `linear-gradient(160deg, ${p.hue}, #fff8)` }} aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm">{best && <span className="sr-only">Best match: </span>}{p.name}</p>
            <span className={`text-xs rounded-full px-2 py-0.5 shrink-0 font-medium ${good ? "bg-teal-soft text-teal-dark" : bad ? "bg-clay-soft text-clay" : "bg-shell"}`}>{p.match}% match</span>
          </div>
          <p className="text-xs text-muted">${p.price} · {p.weight} · {p.keyIngredients.join(", ")}</p>
        </div>
      </div>
      {(best || p.cons.length > 0) && (
        <ul className="mt-2 space-y-1 text-xs">
          {p.pros.slice(0, best ? 3 : 1).map((x) => <li key={x} className="text-teal-dark">✓ {x}</li>)}
          {p.cons.slice(0, 2).map((x) => <li key={x} className="text-clay">✕ {x}</li>)}
        </ul>
      )}
    </div>
  );
}
