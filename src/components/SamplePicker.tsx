"use client";
// One-click access to the three pre-computed sample results (no photos or waiting needed).
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Measured } from "@/lib/types";

export type SampleCard = { id: string; name: string; blurb: string; measured: Measured };
export const SAMPLE_IDS = ["maya", "lena", "zola"];

let cache: SampleCard[] | null = null;

export function useSamples() {
  const [samples, setSamples] = useState<SampleCard[]>(cache || []);
  useEffect(() => {
    if (cache) return;
    Promise.all(SAMPLE_IDS.map((id) => fetch(`/samples/${id}/data.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null))).then((s) => {
      cache = s.filter(Boolean);
      setSamples(cache);
    });
  }, []);
  return samples;
}

/** Compact row of avatar buttons: used in the hero and the sample switcher. */
export function SampleStrip({ current, label = "Try a sample result — no photos needed" }: { current?: string; label?: string }) {
  const samples = useSamples();
  return (
    <div>
      {label && <p className="text-sm font-medium text-ink/80">{label}</p>}
      <ul className="mt-2 grid grid-cols-3 gap-2" aria-label="Sample results">
        {(samples.length ? samples : SAMPLE_IDS.map(() => null as SampleCard | null)).map((s, i) =>
          s ? (
            <li key={s.id}>
              <Link
                href={`/samples/${s.id}`}
                aria-current={current === s.id ? "page" : undefined}
                className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 rounded-2xl border p-2 sm:pr-3 text-center sm:text-left transition hover:border-teal hover:bg-teal-soft/60 ${
                  current === s.id ? "border-teal bg-teal-soft ring-1 ring-teal" : "border-line bg-white"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/samples/${s.id}/front.jpg`} alt="" className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl object-cover object-top" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{s.name} <span aria-hidden className="text-teal">→</span></span>
                  <span className="hidden sm:block truncate text-xs text-muted">
                    {s.measured.type?.mapping.toUpperCase().replace(" TO ", "–")} · frizz {s.measured.frizz?.level}/3
                  </span>
                </span>
              </Link>
            </li>
          ) : (
            <li key={i} className="h-20 sm:h-16 rounded-2xl skeleton" aria-hidden />
          ),
        )}
      </ul>
    </div>
  );
}

/** Large cards for the landing section and /samples page. */
export function SampleGrid() {
  const samples = useSamples();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {samples.map((s) => (
        <Link key={s.id} href={`/samples/${s.id}`} className="card overflow-hidden group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/samples/${s.id}/front.jpg`} alt="" className="aspect-[4/3] w-full object-cover object-top group-hover:opacity-95" />
          <div className="p-4">
            <p className="font-medium">{s.name} <span className="text-muted font-normal">— {s.blurb}</span></p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="chip">Curl {s.measured.type?.mapping.toUpperCase()}</span>
              <span className="chip">Frizz {s.measured.frizz?.level}/3</span>
              <span className="chip">{s.measured.density?.term}</span>
            </div>
            <p className="mt-3 text-sm text-teal font-medium group-hover:underline">View {s.name}&apos;s results →</p>
          </div>
        </Link>
      ))}
      {samples.length === 0 && [0, 1, 2].map((i) => <div key={i} className="card h-72 skeleton" />)}
    </div>
  );
}
