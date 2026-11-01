"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "./AppState";
import { useInstall } from "./Pwa";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#2F6B66" />
      <path d="M9 23c3-4 1-8 4-11s6-1 7-4M13 25c3-4 1-8 4-11s6-1 7-4" stroke="#F6F3EE" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#samples", label: "Sample results" },
  { href: "/#faq", label: "FAQ" },
];

export function Header() {
  const path = usePathname();
  const { openCoach, measured } = useApp();
  const [menu, setMenu] = useState(false);
  const inFlow = path.startsWith("/scan");
  const { canInstall, iosHint, install } = useInstall();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur safe-top">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 btn-dark">Skip to content</a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-lg" aria-label="StrandLab home">
          <Logo />
          <span className="font-serif text-xl tracking-tight">StrandLab</span>
          <span className="hidden md:inline text-xs text-muted border-l border-line pl-2 ml-1">AI hair-care advisor</span>
        </Link>
        <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm text-muted hover:text-ink hover:bg-shell">{n.label}</Link>
          ))}
          {measured && (
            <Link href="/results" className={`rounded-full px-3 py-2 text-sm hover:bg-shell ${path === "/results" ? "text-ink font-medium" : "text-muted"}`}>My results</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {canInstall && (
            <button onClick={install} className="btn-ghost !px-3 hidden md:inline-flex" aria-label="Install StrandLab as an app">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg> Install app
            </button>
          )}
          <button onClick={() => openCoach()} className="btn-ghost !px-3 sm:!px-4" aria-label="Ask the hair coach">
            <ChatIcon /> <span className="hidden sm:inline">Ask the coach</span>
          </button>
          {!inFlow && (
            <Link href="/scan" className="btn-primary hidden sm:inline-flex">Start free scan</Link>
          )}
          <button className="lg:hidden btn-ghost !px-3" aria-expanded={menu} aria-controls="mobile-nav" onClick={() => setMenu(!menu)} aria-label="Menu">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d={menu ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg>
          </button>
        </div>
      </div>
      {menu && (
        <nav id="mobile-nav" aria-label="Mobile" className="lg:hidden border-t border-line bg-paper px-4 py-3 flex flex-col">
          {[...NAV, ...(measured ? [{ href: "/results", label: "My results" }] : []), { href: "/scan", label: "Start free scan" }].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className="rounded-lg px-3 py-3 text-base hover:bg-shell">{n.label}</Link>
          ))}
          {canInstall && <button onClick={() => { setMenu(false); install(); }} className="rounded-lg px-3 py-3 text-base text-left text-teal hover:bg-shell">Install StrandLab app</button>}
          {iosHint && <p className="px-3 py-2 text-sm text-muted">Install on iPhone: tap <b>Share</b> → <b>Add to Home Screen</b>.</p>}
        </nav>
      )}
    </header>
  );
}

export function ChatIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="2.6" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-4 justify-between text-sm text-muted">
        <div className="flex items-center gap-2"><Logo className="h-6 w-6" /> <span>StrandLab · built with YouCam Hair AI, Gemini and Open-Meteo</span></div>
        <p>Cosmetic guidance only — for hair loss or scalp problems, see a dermatologist.</p>
      </div>
    </footer>
  );
}

const STEPS = [
  { href: "/scan", label: "Photos" },
  { href: "/scan/details", label: "Your details" },
  { href: "/results", label: "Results" },
];

/** Progress indicator for the scan flow; completed steps are links back. */
export function Stepper({ current, canVisit }: { current: 0 | 1 | 2; canVisit: (i: number) => boolean }) {
  return (
    <nav aria-label="Scan progress" className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const dot = (
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${active ? "bg-teal text-white" : done ? "bg-teal-soft text-teal-dark" : "bg-shell text-muted"}`}>
              {done ? "✓" : i + 1}
            </span>
          );
          const label = <span className={`${active ? "font-medium text-ink" : "text-muted"} hidden sm:inline`}>{s.label}</span>;
          return (
            <li key={s.href} className="flex items-center gap-2 flex-1 last:flex-none" aria-current={active ? "step" : undefined}>
              {canVisit(i) && !active ? (
                <Link href={s.href} className="flex items-center gap-2 rounded-full hover:underline">{dot}{label}</Link>
              ) : (
                <span className="flex items-center gap-2">{dot}{label}</span>
              )}
              {i < STEPS.length - 1 && <span className={`h-px flex-1 ${done ? "bg-teal/50" : "bg-line"}`} aria-hidden />}
            </li>
          );
        })}
      </ol>
      <p className="sr-only">Step {current + 1} of 3: {STEPS[current].label}</p>
    </nav>
  );
}

/** Sticky bottom bar for the scan flow: always shows a way back and the next action. */
export function FlowNav({ back, backLabel = "Back", next, nextLabel, nextDisabled, hint }: {
  back: () => void;
  backLabel?: string;
  next: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-30 mt-10 border-t border-line bg-paper/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <button onClick={back} className="btn-ghost">← {backLabel}</button>
        <p className="hidden md:block text-sm text-muted text-center flex-1">{hint}</p>
        <button onClick={next} disabled={nextDisabled} className="btn-primary">{nextLabel}</button>
      </div>
    </div>
  );
}
