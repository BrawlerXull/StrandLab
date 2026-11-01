"use client";
import { useState } from "react";
import { Dots } from "./Quiz";

const STARTERS = ["Why no glycerin right now?", "I'm going somewhere humid next week — what changes?", "How do I refresh day-2 hair?", "Is my routine OK for swimming?"];

export default function Coach({ context }: { context: string }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "coach"; text: string }[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    const history = msgs;
    setMsgs([...history, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const r = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context, question, history }) });
      const j = await r.json();
      setMsgs((m) => [...m, { role: "coach", text: r.ok ? j.answer : `Sorry — ${j.error}` }]);
    } catch {
      setMsgs((m) => [...m, { role: "coach", text: "Sorry — the coach is unavailable." }]);
    }
    setBusy(false);
  }

  return (
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">Coach · Gemini, grounded in your measurements</p>
      <h2 className="h2 mt-1">Ask about your hair</h2>
      <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-ink text-paper" : "bg-shell"}`}>{m.text}</div>
        ))}
        {busy && <div className="rounded-2xl bg-shell px-4 py-3 w-fit text-muted"><Dots /></div>}
      </div>
      {msgs.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {STARTERS.map((s) => <button key={s} className="chip hover:bg-shell" onClick={() => ask(s)}>{s}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Can I still use my coconut oil?" className="flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm outline-none focus:border-teal" />
        <button className="btn-dark" disabled={busy || !q.trim()}>Ask</button>
      </form>
    </section>
  );
}
