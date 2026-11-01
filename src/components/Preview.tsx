"use client";
import { useEffect, useMemo, useState } from "react";
import { ALL_TEMPLATES, previewPlan } from "@/lib/rules";
import type { Measured } from "@/lib/types";
import CompareSlider from "./CompareSlider";
import { Dots } from "./Quiz";

type Key = string; // `${feature}:${template}`

export default function Preview({ measured, frontUrl, frontBlob, samplePreviews }: {
  measured: Measured;
  frontUrl: string;
  frontBlob: Blob | null;
  samplePreviews?: Record<string, string>;
}) {
  const [pres, setPres] = useState<"feminine" | "masculine">("feminine");
  const plan = useMemo(() => previewPlan(measured, pres), [measured, pres]);
  const [imgs, setImgs] = useState<Record<Key, string>>(samplePreviews || {});
  const [busy, setBusy] = useState<Record<Key, boolean>>({});
  const [err, setErr] = useState("");
  const [extra, setExtra] = useState<Key | null>(null);

  async function load(feature: string, template: string) {
    const k = `${feature}:${template}`;
    if (imgs[k] || busy[k]) return;
    if (!frontBlob) return setErr("Live previews need your own photo — this sample only includes its pre-rendered looks.");
    setBusy((b) => ({ ...b, [k]: true }));
    try {
      const fd = new FormData();
      fd.append("image", frontBlob);
      fd.append("feature", feature);
      fd.append("template", template);
      const r = await fetch("/api/preview", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setImgs((m) => ({ ...m, [k]: j.url }));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy((b) => ({ ...b, [k]: false }));
  }

  useEffect(() => {
    load(plan.feature, plan.realistic.template);
    if (plan.promise.template !== plan.realistic.template) load(plan.feature, plan.promise.template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const rk = `${plan.feature}:${plan.realistic.template}`;
  const pk = `${plan.feature}:${plan.promise.template}`;
  const single = rk === pk;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Expectation check · YouCam {plan.feature === "hair-vol" ? "Hair Volume" : "Wavy Hair"} VTO</p>
          <h2 className="h2 mt-2">What this routine can do — vs what the ad promises</h2>
          <p className="mt-2 max-w-3xl text-muted">{plan.why} Shoppers abandon products when they expect the ad photo. Here is the realistic target, on you.</p>
        </div>
        <div className="flex rounded-full border border-line bg-white p-1 text-sm">
          {(["feminine", "masculine"] as const).map((p) => (
            <button key={p} onClick={() => setPres(p)} className={`rounded-full px-3 py-1 ${pres === p ? "bg-ink text-paper" : ""}`}>{p === "feminine" ? "Style set A" : "Style set B"}</button>
          ))}
        </div>
      </div>
      <div className={`mt-6 grid gap-4 ${single ? "sm:grid-cols-2 max-w-3xl" : "sm:grid-cols-3"}`}>
        <Panel title="Today" src={frontUrl} />
        <Panel title={`Realistic: ${plan.realistic.label}`} src={imgs[rk]} loading={busy[rk]} tone="teal" />
        {!single && <Panel title={`The ad promise: ${plan.promise.label}`} src={imgs[pk]} loading={busy[pk]} tone="clay" />}
      </div>
      {imgs[rk] && (
        <div className="mt-6 max-w-sm">
          <p className="eyebrow mb-2">Slide: today ↔ realistic</p>
          <CompareSlider before={frontUrl} after={imgs[rk]} beforeLabel="Today" afterLabel="Realistic" />
        </div>
      )}
      <div className="mt-6">
        <p className="eyebrow">Try another look {frontBlob ? "(1–2 YouCam units each, cached)" : ""}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_TEMPLATES.filter((t) => samplePreviews ? !!imgs[`${t.feature}:${t.template}`] : true).map((t) => {
            const k = `${t.feature}:${t.template}`;
            return (
              <button key={k} onClick={() => { setExtra(k); load(t.feature, t.template); }} className={`chip ${extra === k ? "border-teal text-teal" : ""}`}>
                {busy[k] ? <Dots /> : null}{t.label}
              </button>
            );
          })}
        </div>
        {extra && (imgs[extra] || busy[extra]) && (
          <div className="mt-4 max-w-xs"><Panel title={ALL_TEMPLATES.find((t) => `${t.feature}:${t.template}` === extra)?.label || ""} src={imgs[extra]} loading={busy[extra]} /></div>
        )}
      </div>
      {err && <p className="mt-3 text-sm text-clay">{err}</p>}
    </section>
  );
}

function Panel({ title, src, loading, tone }: { title: string; src?: string; loading?: boolean; tone?: "teal" | "clay" }) {
  return (
    <figure className={`card overflow-hidden ${tone === "teal" ? "ring-2 ring-teal/50" : ""}`}>
      <div className="relative aspect-[3/4]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 skeleton flex items-center justify-center text-sm text-muted">{loading ? "Rendering on YouCam…" : ""}</div>
        )}
      </div>
      <figcaption className={`px-3 py-2 text-sm font-medium ${tone === "clay" ? "text-clay" : tone === "teal" ? "text-teal-dark" : ""}`}>{title}</figcaption>
    </figure>
  );
}
