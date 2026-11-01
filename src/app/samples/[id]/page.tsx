"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Results from "@/components/Results";
import type { Climate, Measured, Porosity } from "@/lib/types";

type Sample = { id: string; name: string; blurb: string; measured: Measured; porosity: Porosity; climate: Climate | null; previews: Record<string, string> };
const OTHERS = ["maya", "lena", "zola"];

export default function SamplePage({ params }: { params: { id: string } }) {
  const [s, setS] = useState<Sample | null | "missing">(null);
  useEffect(() => {
    fetch(`/samples/${params.id}/data.json`).then((r) => (r.ok ? r.json() : "missing")).then(setS).catch(() => setS("missing"));
  }, [params.id]);

  if (s === "missing")
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="h2">Sample not found</h1>
        <Link href="/#samples" className="btn-ghost mt-6">Back to samples</Link>
      </div>
    );
  if (!s) return <div className="mx-auto max-w-6xl px-4 py-16"><div className="h-96 card skeleton" /></div>;

  return (
    <>
      <div className="border-b border-line bg-amber-soft/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p><b>Sample result:</b> {s.name} — {s.blurb}. AI-generated person, real YouCam measurements.</p>
          <nav aria-label="Other samples" className="flex items-center gap-2">
            <Link href="/#samples" className="text-muted hover:text-ink">← All samples</Link>
            {OTHERS.filter((o) => o !== s.id).map((o) => (
              <Link key={o} href={`/samples/${o}`} className="chip hover:bg-shell capitalize">{o}</Link>
            ))}
            <Link href="/scan" className="btn-primary !py-1.5">Scan my hair</Link>
          </nav>
        </div>
      </div>
      <Results
        key={s.id}
        title={`${s.name}'s hair profile`}
        sampleName={s.name}
        profile={{ measured: s.measured, porosity: s.porosity, climate: s.climate }}
        frontUrl={`/samples/${s.id}/front.jpg`}
        frontBlob={null}
        samplePreviews={Object.fromEntries(Object.entries(s.previews).map(([k, v]) => [k, `/samples/${s.id}/${v}`]))}
        history={[]}
      />
    </>
  );
}
