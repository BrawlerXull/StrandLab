"use client";
import { useMemo, useState } from "react";
import { CATEGORIES, shortlist } from "@/lib/catalog";
import { recommend, TAG_INFO, TYPE_MAPPINGS } from "@/lib/rules";
import type { Profile, Rec, ScoredProduct, Tag } from "@/lib/types";
import { ClimateBadge } from "./Quiz";
import LabelCheck from "./LabelCheck";
import Preview from "./Preview";
import Coach from "./Coach";

export function contextFor(p: Profile, rec: Rec) {
  const m = p.measured;
  const seek = (Object.values(rec.tags) as Rec["tags"][Tag][]).filter((t) => t.score > 0).map((t) => `${TAG_INFO[t.tag].label} (+${t.score}): ${t.why.join("; ")}`);
  const avoid = (Object.values(rec.tags) as Rec["tags"][Tag][]).filter((t) => t.score < 0).map((t) => `${TAG_INFO[t.tag].label} (${t.score}): ${t.why.join("; ")}`);
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

export default function Results({ profile, frontUrl, frontBlob, samplePreviews, onRestart, onRetake, history }: {
  profile: Profile;
  frontUrl: string;
  frontBlob: Blob | null;
  samplePreviews?: Record<string, string>;
  onRestart: () => void;
  onRetake: () => void;
  history: { date: string; frizz: number | null; density: number | null; type: string | null }[];
}) {
  const rec = useMemo(() => recommend(profile), [profile]);
  const shop = useMemo(() => shortlist(rec), [rec]);
  const m = profile.measured;
  const tags = Object.values(rec.tags) as Rec["tags"][Tag][];
  const seek = tags.filter((t) => t.score > 0).sort((a, b) => b.score - a.score);
  const avoid = tags.filter((t) => t.score < 0).sort((a, b) => a.score - b.score);
  const kit = CATEGORIES.map((c) => shop[c][0]).filter((p) => p.match >= 50);
  const kitTotal = kit.reduce((a, p) => a + p.price, 0);
  const prev = history.length > 1 ? history[history.length - 2] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-12">
      {/* Profile */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Step 3 of 3 · Your hair profile</p>
            <h2 className="h2 mt-2">{rec.headline}</h2>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onRetake}>Retake photos</button>
            <button className="btn-ghost" onClick={onRestart}>Start over</button>
          </div>
        </div>

        {m.issues.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber/40 bg-amber-soft p-4 text-sm">
            <p className="font-medium">Some measurements need a better photo</p>
            <ul className="mt-1 list-disc pl-5">
              {m.issues.map((i) => (
                <li key={i.detector}><b>{i.detector}:</b> {i.hint} <span className="receipt">({i.code})</span></li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frontUrl} alt="Your front photo" className="aspect-[3/4] lg:aspect-auto lg:h-full w-full object-cover" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat api="Hair Type Detection" label="Curl pattern" value={m.type?.mapping.toUpperCase() ?? "—"} sub={m.type?.term}>
              {m.type && <Scale steps={TYPE_MAPPINGS.length} at={m.type.index} labels={["1", "2", "3", "4"]} />}
            </Stat>
            <Stat api="Hair Frizziness Detection" label="Frizz" value={m.frizz ? `${m.frizz.level}/3` : "—"} sub={m.frizz?.term} delta={prev && prev.frizz !== null && m.frizz ? m.frizz.level - prev.frizz : null}>
              {m.frizz && <Meter v={m.frizz.level} max={3} tone="clay" />}
            </Stat>
            <Stat api="Hair Density Detection" label="Density" value={m.density ? m.density.value.toFixed(2) : "—"} sub={m.density?.term}>
              {m.density && <Meter v={m.density.value} max={3} tone="teal" />}
            </Stat>
            <Stat api="Hair Length Detection" label="Length" value={m.length ? cap(m.length.band) : "—"} sub={m.length?.term} />
            <div className="card p-4">
              <p className="eyebrow">Porosity · quiz</p>
              <p className="mt-1 font-serif text-3xl">{cap(profile.porosity)}</p>
              <p className="text-sm text-muted">{profile.porosity === "low" ? "Cuticle lies flat — resists absorbing" : profile.porosity === "high" ? "Raised cuticle — absorbs fast, loses fast" : "Absorbs and holds moisture well"}</p>
            </div>
            {profile.climate ? <ClimateBadge c={profile.climate} /> : <div className="card p-4 text-sm text-muted">No location given — climate rules skipped.</div>}
          </div>
        </div>
        {Object.keys(m.framing).length > 0 && (
          <p className="mt-3 receipt">auto-framing: {Object.entries(m.framing).map(([k, v]) => `${k} → ${v}`).join(" · ")}</p>
        )}
      </section>

      {/* Ingredient rules */}
      <section>
        <p className="eyebrow">Why · the rule engine</p>
        <h2 className="h2 mt-2">What your hair needs, and why</h2>
        <p className="mt-2 max-w-3xl text-muted">Every line traces back to a measurement. No black box: each measurement adds or subtracts points for an ingredient family.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <TagList title="Look for" items={seek} tone="teal" />
          <TagList title="Avoid or limit" items={avoid} tone="clay" />
        </div>
      </section>

      {/* Routine */}
      <section>
        <p className="eyebrow">Routine · {rec.weight} weight</p>
        <h2 className="h2 mt-2">Your wash-day, step by step</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rec.routine.map((r, i) => (
            <li key={r.step} className="card p-4">
              <p className="receipt">{String(i + 1).padStart(2, "0")}</p>
              <p className="font-medium">{r.step}</p>
              <p className="text-sm mt-1">{r.detail}</p>
              <p className="text-xs text-muted mt-2">{r.why}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Expectation check */}
      <Preview measured={m} frontUrl={frontUrl} frontBlob={frontBlob} samplePreviews={samplePreviews} />

      {/* Shop */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Shortlist · demo catalogue</p>
            <h2 className="h2 mt-2">Products ranked for your profile</h2>
          </div>
          <div className="card px-4 py-3 text-sm">
            Starter kit: <b>{kit.length} products · ${kitTotal}</b>
            <span className="text-muted"> instead of guessing your way through a shelf</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <CategoryCard key={c} category={c} items={shop[c]} />
          ))}
          <LabelCheck rec={rec} />
        </div>
        <p className="mt-3 receipt">Fictional demo products for illustration. Scores are rule-based; match = 55 + 9 × (sum of ingredient scores ± texture fit).</p>
      </section>

      <Coach context={contextFor(profile, rec)} />

      <p className="text-xs text-muted text-center">StrandLab gives cosmetic guidance only. For hair loss, scalp pain or sudden shedding, see a dermatologist.</p>
    </div>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function Stat({ api, label, value, sub, children, delta }: { api: string; label: string; value: string; sub?: string; children?: React.ReactNode; delta?: number | null }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span className="receipt">YouCam · {api}</span>
      </div>
      <p className="mt-1 font-serif text-3xl">
        {value}
        {delta !== null && delta !== undefined && delta !== 0 && (
          <span className={`ml-2 text-sm font-sans ${delta < 0 ? "text-teal" : "text-clay"}`}>{delta < 0 ? `▼${-delta}` : `▲${delta}`} since last scan</span>
        )}
      </p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Meter({ v, max, tone }: { v: number; max: number; tone: "teal" | "clay" }) {
  return (
    <div className="h-2 rounded-full bg-shell overflow-hidden" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full rounded-full ${tone === "teal" ? "bg-teal" : "bg-clay"}`} style={{ width: `${Math.max(4, (v / max) * 100)}%` }} />
    </div>
  );
}

function Scale({ steps, at, labels }: { steps: number; at: number; labels: string[] }) {
  return (
    <div>
      <div className="flex gap-1">
        {Array.from({ length: steps }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i === at ? "bg-teal" : i < at ? "bg-teal/30" : "bg-shell"}`} />
        ))}
      </div>
      <div className="mt-1 flex justify-between receipt">
        {labels.map((l) => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}

function TagList({ title, items, tone }: { title: string; items: Rec["tags"][Tag][]; tone: "teal" | "clay" }) {
  return (
    <div className="card p-5">
      <p className={`font-medium ${tone === "teal" ? "text-teal-dark" : "text-clay"}`}>{title}</p>
      {items.length === 0 && <p className="mt-2 text-sm text-muted">Nothing strongly indicated.</p>}
      <ul className="mt-3 space-y-3">
        {items.map((t) => (
          <li key={t.tag}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{TAG_INFO[t.tag].label}</span>
              <span className={`font-mono text-xs rounded-full px-2 py-0.5 ${tone === "teal" ? "bg-teal-soft text-teal-dark" : "bg-clay-soft text-clay"}`}>{t.score > 0 ? `+${t.score}` : t.score}</span>
            </div>
            <p className="receipt">{TAG_INFO[t.tag].examples}</p>
            <ul className="mt-1 text-xs text-muted list-disc pl-4">
              {t.why.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryCard({ category, items }: { category: string; items: ScoredProduct[] }) {
  const [open, setOpen] = useState(false);
  const top = items[0];
  return (
    <div className="card p-5 flex flex-col">
      <p className="eyebrow">{category}</p>
      <ProductRow p={top} best />
      {open && items.slice(1).map((p) => <ProductRow key={p.id} p={p} />)}
      {items.length > 1 && (
        <button className="mt-3 text-sm text-teal hover:underline self-start" onClick={() => setOpen(!open)}>
          {open ? "Hide others" : `Compare ${items.length - 1} more`}
        </button>
      )}
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
            <p className="font-medium text-sm truncate">{p.name}</p>
            <span className={`font-mono text-xs rounded-full px-2 py-0.5 shrink-0 ${good ? "bg-teal-soft text-teal-dark" : bad ? "bg-clay-soft text-clay" : "bg-shell"}`}>{p.match}%</span>
          </div>
          <p className="text-xs text-muted">${p.price} · {p.weight} · {p.keyIngredients.join(", ")}</p>
        </div>
      </div>
      {(best || p.cons.length > 0) && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {p.pros.slice(0, best ? 3 : 1).map((x) => <li key={x} className="text-teal-dark">✓ {x}</li>)}
          {p.cons.slice(0, 2).map((x) => <li key={x} className="text-clay">✕ {x}</li>)}
        </ul>
      )}
    </div>
  );
}
