"use client";
// Outlook (routine switching by forecast dew point) and progress tracking (re-scan loop).
import Link from "next/link";
import { dayAdvice } from "@/lib/rules";
import type { Climate } from "@/lib/types";
import type { Hist } from "./AppState";

export function Outlook({ climate, frizz }: { climate: Climate; frizz: number }) {
  if (!climate.days?.length) return null;
  const fmt = (d: string, i: number) => (i === 0 ? "Today" : new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "long" }));
  return (
    <section aria-labelledby="outlook-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="outlook-title" className="text-lg font-medium">Your routine this week</h2>
        <p className="text-xs text-muted">Peak dew point per day · {climate.place} · Open-Meteo forecast</p>
      </div>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {climate.days.map((d, i) => {
          const a = dayAdvice(d.band, frizz);
          const tone = a.tone === "amber" ? "border-amber/40 bg-amber-soft/60" : a.tone === "clay" ? "border-clay/30 bg-clay-soft/50" : "border-teal/30 bg-teal-soft/50";
          return (
            <li key={d.date} className={`rounded-2xl border p-4 ${tone}`}>
              <p className="text-sm font-semibold">{fmt(d.date, i)}</p>
              <p className="font-serif text-2xl mt-0.5">{Math.round(d.dewMax)}°C <span className="text-xs font-sans text-muted">dew point</span></p>
              <p className="mt-2 text-sm font-medium">{a.title}</p>
              <p className="text-xs text-ink/75">{a.detail}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ics(): string {
  const start = new Date(Date.now() + 14 * 864e5);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 15 * 60e3);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const url = typeof window !== "undefined" ? `${window.location.origin}/scan` : "/scan";
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StrandLab//EN", "BEGIN:VEVENT",
    `UID:${Date.now()}@strandlab`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    "SUMMARY:StrandLab re-scan: is my routine working?",
    `DESCRIPTION:Re-scan your hair to compare frizz and density with two weeks ago. ${url}`,
    `URL:${url}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadReminder() {
  const blob = new Blob([ics()], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "strandlab-rescan.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ProgressTracker({ history, isSample }: { history: Hist[]; isSample?: boolean }) {
  const pts = history.filter((h) => h.frizz !== null);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const change = pts.length > 1 && first && last ? (last.frizz as number) - (first.frizz as number) : null;
  const W = 280, H = 90, pad = 14;
  const x = (i: number) => pad + (pts.length > 1 ? (i * (W - 2 * pad)) / (pts.length - 1) : (W - 2 * pad) / 2);
  const y = (v: number) => H - pad - (v / 3) * (H - 2 * pad);
  const date = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });

  return (
    <section aria-labelledby="progress-title" className="card p-5 grid gap-5 md:grid-cols-[1fr_auto] items-center">
      <div>
        <h2 id="progress-title" className="text-lg font-medium">Is your routine working?</h2>
        {isSample ? (
          <p className="mt-1 text-sm text-ink/75">After a scan, StrandLab keeps your measurements on your device. Re-scan in two weeks and it shows whether frizz actually dropped — proof instead of guessing.</p>
        ) : pts.length < 2 ? (
          <p className="mt-1 text-sm text-ink/75">This is your first scan. Follow the routine for two weeks, then re-scan: StrandLab compares frizz and density so you know whether the products are working before you buy more.</p>
        ) : (
          <p className="mt-1 text-sm text-ink/75">
            Frizz went from <b>{first.frizz}/3</b> ({date(first.date)}) to <b>{last.frizz}/3</b> ({date(last.date)}) —{" "}
            {change! < 0 ? <b className="text-teal-dark">your routine is working.</b> : change === 0 ? <b>no change yet; give it another two weeks.</b> : <b className="text-clay">frizz is up — check humectants against the weather.</b>}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={downloadReminder} className="btn-ghost !py-2">📅 Remind me to re-scan in 2 weeks</button>
          {!isSample && pts.length >= 1 && <Link href="/scan" className="btn-ghost !py-2">Re-scan now</Link>}
        </div>
        <p className="mt-2 text-xs text-muted">Scans are stored only in this browser.</p>
      </div>
      {pts.length >= 2 && (
        <figure className="shrink-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-[280px] h-[90px]" role="img" aria-label={`Frizz over ${pts.length} scans, from ${first.frizz} to ${last.frizz} out of 3`}>
            {[0, 1, 2, 3].map((v) => <line key={v} x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="#DCD3C5" strokeDasharray="3 4" />)}
            <polyline fill="none" stroke="#B5543C" strokeWidth="2.5" points={pts.map((p, i) => `${x(i)},${y(p.frizz as number)}`).join(" ")} />
            {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.frizz as number)} r="4" fill="#B5543C" />)}
          </svg>
          <figcaption className="text-xs text-muted text-center">Frizz score per scan (0–3)</figcaption>
        </figure>
      )}
    </section>
  );
}
