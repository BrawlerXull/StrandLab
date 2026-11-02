"use client";
// Global coach: floating launcher + accessible slide-over chat panel, available on every page.
// Uses the measured profile as context when one exists (results / sample pages set it).
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "./AppState";
import Markdown from "./Markdown";
import { ChatIcon, isBare, Logo } from "./Shell";
import { Dots } from "./Quiz";
import { LANGS, langById } from "@/lib/langs";
import { MicIcon, SpeakerIcon, useSpeak, useVoiceInput } from "./Speech";

const LANG_KEY = "sl-coach-lang";

type Msg = { role: "user" | "coach"; text: string; label?: string; error?: boolean; followups?: string[]; fallback?: boolean };

const GENERAL = ["What does 3A or 4C mean?", "What is hair porosity?", "Why does glycerin make my hair frizzy?", "How does StrandLab work?"];
const PERSONAL = ["Explain my results simply", "Why should I avoid glycerin right now?", "Build me a 3-product routine", "What should I change in humid weather?"];

export function Sparkle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" />
    </svg>
  );
}

export default function CoachWidget() {
  const { coachOpen, openCoach, closeCoach, pendingQuestion, clearPending, coachContext } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const lastCtx = useRef<string | null>(null);
  const path = usePathname();
  const inFlow = path.startsWith("/scan") || path.startsWith("/quick");
  const [lang, setLang] = useState("auto");
  useEffect(() => {
    try {
      setLang(localStorage.getItem(LANG_KEY) || "auto");
    } catch {
      /* ignore */
    }
  }, []);
  const chooseLang = (v: string) => {
    setLang(v);
    try {
      localStorage.setItem(LANG_KEY, v);
    } catch {
      /* ignore */
    }
  };
  const bcp = langById(lang).bcp;
  const tts = useSpeak();
  const mic = useVoiceInput(lang, (t) => {
    setQ(t);
    ask(t);
  });

  // Reset the conversation when the profile it is grounded in changes.
  useEffect(() => {
    const key = coachContext?.text ?? null;
    if (lastCtx.current !== key && msgs.length) setMsgs([]);
    lastCtx.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachContext]);

  useEffect(() => {
    if (!coachOpen) tts.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachOpen]);

  useEffect(() => {
    if (!coachOpen) return;
    setTimeout(() => input.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCoach();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coachOpen, closeCoach]);

  useEffect(() => {
    if (coachOpen && pendingQuestion) {
      ask(pendingQuestion.q, pendingQuestion.label);
      clearPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachOpen, pendingQuestion]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function ask(question: string, label?: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history = msgs.filter((m) => !m.error).map(({ role, text }) => ({ role, text }));
    setMsgs([...msgs, { role: "user", text, label }]);
    setQ("");
    setBusy(true);
    try {
      const r = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: coachContext?.text || "", question: text, history, lang }),
      });
      const j = await r.json();
      setMsgs((m) => [...m, r.ok ? { role: "coach", text: j.answer, followups: j.followups || [], fallback: !!j.fallback } : { role: "coach", text: j.error || "Something went wrong.", error: true }]);
    } catch {
      setMsgs((m) => [...m, { role: "coach", text: "The coach is unavailable right now. Please try again.", error: true }]);
    }
    setBusy(false);
  }

  const starters = coachContext ? PERSONAL : GENERAL;

  if (isBare(path)) return null;
  return (
    <>
      {!coachOpen && (
        <button
          onClick={() => openCoach()}
          className={`fixed ${inFlow ? "bottom-24" : "bottom-5"} right-4 sm:right-5 z-40 flex items-center gap-2 rounded-full bg-teal px-4 py-3 sm:px-5 sm:py-3.5 mb-[env(safe-area-inset-bottom)] text-white shadow-card shadow-teal/30 hover:bg-teal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal`}
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
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 bg-white safe-top">
          <div className="flex items-start gap-3">
            <Logo className="h-9 w-9 mt-0.5" />
            <div>
              <h2 id="coach-title" className="font-serif text-xl leading-tight">StrandLab coach</h2>
              <p className="text-xs text-muted">
                {coachContext ? <>Answers use <b className="text-teal-dark">{coachContext.label}</b></> : "General hair-care help · scan to get personal answers"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
          {msgs.length > 0 && <button onClick={() => setMsgs([])} className="btn-ghost !px-3 !py-1.5 text-xs" aria-label="Start a new conversation">New chat</button>}
          <button onClick={closeCoach} className="btn-ghost !p-2" aria-label="Close coach">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-line bg-white/70 px-5 py-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
          <label htmlFor="coach-lang" className="text-xs text-muted shrink-0">Reply in</label>
          <select id="coach-lang" value={lang} onChange={(e) => chooseLang(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
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
                <p className="mt-2 text-muted">Type or {mic.supported ? "tap the mic and speak" : "write"} in any language — I&apos;ll reply in the same one.{tts.supported ? " Tap “Listen” on any answer to hear it read aloud." : ""}</p>
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
              <div key={i} dir="auto" className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-paper">
                <span className="sr-only">You said: </span>
                {m.label ? <span className="inline-flex items-center gap-1.5"><Sparkle /> {m.label}</span> : m.text}
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <Logo className="h-7 w-7 shrink-0 mt-1" />
                <div dir="auto" className={`max-w-[88%] rounded-2xl rounded-tl-md border px-4 py-3 text-[15px] ${m.error ? "border-clay/40 bg-clay-soft text-clay" : "border-line bg-white text-ink/90"}`}>
                  <span className="sr-only">Coach replied: </span>
                  <Markdown text={m.text} />
                  {m.fallback && <p className="mt-2 text-[11px] text-muted">The AI coach is busy, so this answer comes straight from your StrandLab results.</p>}
                  {tts.supported && !m.error && (
                    <button
                      onClick={() => (tts.speakingId === `m${i}` ? tts.stop() : tts.speak(`m${i}`, m.text, bcp || undefined))}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink hover:bg-shell"
                      aria-pressed={tts.speakingId === `m${i}`}
                    >
                      <SpeakerIcon on={tts.speakingId === `m${i}`} /> {tts.speakingId === `m${i}` ? "Stop reading" : "Listen"}
                    </button>
                  )}
                  {i === msgs.length - 1 && !busy && m.followups && m.followups.length > 0 && (
                    <div className="mt-4 border-t border-line pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Ask next</p>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {m.followups.map((f) => (
                          <button key={f} onClick={() => ask(f)} className="group flex items-center justify-between gap-2 rounded-xl border border-teal/25 bg-teal-soft/40 px-3 py-2 text-left text-sm text-teal-dark hover:bg-teal-soft hover:border-teal/50">
                            <span>{f}</span>
                            <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="border-t border-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
              placeholder={mic.listening ? "Listening… speak now" : mic.transcribing ? "Writing down what you said…" : "Ask about your hair, in any language…"}
              className="flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-teal max-h-32"
            />
            {mic.supported && (
              <button
                type="button"
                onClick={() => (mic.listening ? mic.stop() : mic.start())}
                disabled={busy || mic.transcribing}
                className={`btn relative !px-3.5 !py-3 border ${mic.listening ? "border-clay bg-clay text-white" : "border-line bg-white hover:bg-shell"}`}
                style={mic.listening ? { boxShadow: `0 0 0 ${2 + Math.round(mic.level * 10)}px rgb(var(--c-clay) / 0.25)` } : undefined}
                aria-pressed={mic.listening}
                aria-label={mic.listening ? "Stop voice input" : "Ask by voice"}
                title={mic.listening ? "Stop" : "Ask by voice"}
              >
                {mic.transcribing ? <Dots /> : <MicIcon />}
              </button>
            )}
            <button className="btn-primary !px-4 !py-3" disabled={busy || !q.trim()} aria-label="Send question">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted" role="status">
            {mic.error || (mic.listening ? "Listening — I'll send when you stop talking (or tap the mic)." : mic.transcribing ? "Turning your voice into text…" : "Enter to send · Shift+Enter for a new line · Esc to close. Cosmetic advice only.")}
          </p>
        </form>
      </div>
    </>
  );
}
