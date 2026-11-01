"use client";
// Global coach: floating launcher + accessible slide-over chat panel, available on every page.
// Uses the measured profile as context when one exists (results / sample pages set it).
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "./AppState";
import Markdown from "./Markdown";
import { ChatIcon, Logo } from "./Shell";
import { Dots } from "./Quiz";

type Msg = { role: "user" | "coach"; text: string; error?: boolean };

const GENERAL = ["What does 3A or 4C mean?", "What is hair porosity?", "Why does glycerin make my hair frizzy?", "How does StrandLab work?"];
const PERSONAL = ["Explain my results simply", "Why should I avoid glycerin right now?", "Build me a 3-product routine", "What should I change in humid weather?"];

export default function CoachWidget() {
  const { coachOpen, openCoach, closeCoach, pendingQuestion, clearPending, coachContext } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const lastCtx = useRef<string | null>(null);
  const inFlow = usePathname().startsWith("/scan");

  // Reset the conversation when the profile it is grounded in changes.
  useEffect(() => {
    const key = coachContext?.text ?? null;
    if (lastCtx.current !== key && msgs.length) setMsgs([]);
    lastCtx.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachContext]);

  useEffect(() => {
    if (!coachOpen) return;
    setTimeout(() => input.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCoach();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coachOpen, closeCoach]);

  useEffect(() => {
    if (coachOpen && pendingQuestion) {
      ask(pendingQuestion);
      clearPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachOpen, pendingQuestion]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history = msgs.filter((m) => !m.error);
    setMsgs([...msgs, { role: "user", text }]);
    setQ("");
    setBusy(true);
    try {
      const r = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: coachContext?.text || "", question: text, history }),
      });
      const j = await r.json();
      setMsgs((m) => [...m, r.ok ? { role: "coach", text: j.answer } : { role: "coach", text: j.error || "Something went wrong.", error: true }]);
    } catch {
      setMsgs((m) => [...m, { role: "coach", text: "The coach is unavailable right now. Please try again.", error: true }]);
    }
    setBusy(false);
  }

  const starters = coachContext ? PERSONAL : GENERAL;

  return (
    <>
      {!coachOpen && (
        <button
          onClick={() => openCoach()}
          className={`fixed ${inFlow ? "bottom-24" : "bottom-5"} right-5 z-40 flex items-center gap-2 rounded-full bg-teal px-5 py-3.5 text-white shadow-card shadow-teal/30 hover:bg-teal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal`}
          aria-label="Open the StrandLab hair coach"
        >
          <ChatIcon className="h-5 w-5" />
          <span className="font-medium">Ask the coach</span>
        </button>
      )}

      {coachOpen && <div className="fixed inset-0 z-40 bg-ink/30 sm:bg-ink/20" onClick={closeCoach} aria-hidden />}

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-title"
        className={`fixed z-50 inset-y-0 right-0 w-full sm:w-[440px] bg-paper shadow-2xl border-l border-line flex flex-col transition-transform duration-200 ${coachOpen ? "translate-x-0" : "translate-x-full invisible"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 bg-white">
          <div className="flex items-start gap-3">
            <Logo className="h-9 w-9 mt-0.5" />
            <div>
              <h2 id="coach-title" className="font-serif text-xl leading-tight">StrandLab coach</h2>
              <p className="text-xs text-muted">
                {coachContext ? <>Answers use <b className="text-teal-dark">{coachContext.label}</b></> : "General hair-care help · scan to get personal answers"}
              </p>
            </div>
          </div>
          <button onClick={closeCoach} className="btn-ghost !p-2" aria-label="Close coach">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div ref={scroller} className="flex-1 overflow-y-auto px-5 py-5 space-y-4" aria-live="polite" aria-busy={busy}>
          {msgs.length === 0 && (
            <div>
              <div className="rounded-2xl bg-white border border-line p-4 text-sm leading-relaxed">
                <p className="font-medium">Hi! I&apos;m your hair-care coach.</p>
                <p className="mt-1 text-muted">
                  {coachContext
                    ? "I can see your measured hair profile, so I can explain your results, ingredients and routine in plain language."
                    : "Ask me anything about curl types, porosity, frizz or ingredients. Run a scan and my answers become personal to your hair."}
                </p>
              </div>
              <p className="eyebrow mt-5 mb-2">Try asking</p>
              <div className="flex flex-col gap-2">
                {starters.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="text-left rounded-xl border border-line bg-white px-4 py-3 text-sm hover:border-teal hover:bg-teal-soft/40">{s}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-paper">
                <span className="sr-only">You said: </span>{m.text}
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <Logo className="h-7 w-7 shrink-0 mt-1" />
                <div className={`max-w-[88%] rounded-2xl rounded-tl-md border px-4 py-3 text-[15px] ${m.error ? "border-clay/40 bg-clay-soft text-clay" : "border-line bg-white text-ink/90"}`}>
                  <span className="sr-only">Coach replied: </span>
                  <Markdown text={m.text} />
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex gap-2.5 items-center text-sm text-muted">
              <Logo className="h-7 w-7" /> <span className="rounded-2xl border border-line bg-white px-4 py-3 inline-flex items-center gap-2"><Dots /> Thinking…</span>
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="border-t border-line bg-white p-4">
          <label htmlFor="coach-input" className="sr-only">Your question</label>
          <div className="flex items-end gap-2">
            <textarea
              id="coach-input"
              ref={input}
              value={q}
              rows={1}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(q);
                }
              }}
              placeholder="Ask about your hair…"
              className="flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-teal max-h-32"
            />
            <button className="btn-primary !px-4 !py-3" disabled={busy || !q.trim()} aria-label="Send question">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">Enter to send · Shift+Enter for a new line · Esc to close. Cosmetic advice only.</p>
        </form>
      </div>
    </>
  );
}
