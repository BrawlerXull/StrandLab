// POST { context?, question, history } -> short, well-structured answer from Gemini.
// With context: grounded in the measured profile + rule-engine output. Without: general hair-care help.
import { NextResponse } from "next/server";
import { generate } from "@/lib/gemini";
import { langById } from "@/lib/langs";

export const runtime = "nodejs";

const STYLE = `FORMAT (strict):
- Start with one short sentence that directly answers the question.
- Then 2–5 bullet points ("- ") or numbered steps ("1. ") — one idea each, max ~20 words per bullet.
- Use **bold** only for 1–3 key terms. No headings, no tables, no emojis.
- Max 130 words total. Plain, friendly language a non-expert understands; explain jargon in brackets the first time.

OUTPUT: strict JSON {"answer": string (the formatted reply above, using \n for line breaks), "followups": [3 short follow-up questions the user is likely to ask next, each under 9 words, written in the user's voice, specific to this answer]}.`;

const ABOUT = `About StrandLab (the app you live in): users take 4 photos; YouCam Hair AI measures curl pattern (1–4C), frizz (0–3), density (0–3) and length. A porosity quiz and the local dew point are added. A rule engine scores 14 ingredient families, ranks products, checks pasted ingredient labels, and shows a realistic vs "ad promise" hair preview.`;

/**
 * Fallback when Gemini is unavailable (quota / outage): answer from the rule engine's own output, which is in
 * the context. Less conversational, but grounded and never empty.
 */
function fallback(context: string | undefined, question: string) {
  const q = question.toLowerCase();
  const line = (k: string) => (context || "").split("\n").find((l) => l.startsWith(k))?.slice(k.length).trim() || "";
  const items = (k: string) => line(k).split(" | ").filter(Boolean);
  if (!context?.trim()) {
    return {
      answer:
        "The AI coach is busy right now, so here is the short version.\n- **Curl pattern** (1 straight → 4 coily) and **porosity** (how fast hair absorbs water) decide which ingredients work.\n- **Dew point** matters too: glycerin helps between about 4 and 15 °C and can cause frizz outside that range.\n- Run a StrandLab scan (or try a sample) and every answer becomes specific to your hair.",
      followups: ["How does the StrandLab scan work?", "What is hair porosity?", "Why does glycerin cause frizz?"],
    };
  }
  const seek = items("SEEK:"),
    avoid = items("AVOID:"),
    routine = items("ROUTINE:");
  // Match the question to a specific ingredient family or routine step when possible.
  const word = (s: string) => s.split(/[(:]/)[0].trim();
  const STOP = new Set(["why", "should", "avoid", "look", "what", "does", "about", "with", "this", "that", "hair", "have", "will", "they", "there", "which", "from", "your", "into", "more", "less", "good", "need", "make", "makes", "using", "products", "product"]);
  const keys = q.split(/[^a-z0-9-]+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.replace(/s$/, ""));
  const hit = [...seek.map((x) => ["look for", x] as const), ...avoid.map((x) => ["avoid", x] as const)].find(([, x]) => keys.some((k) => x.toLowerCase().includes(k)));
  if (hit) {
    const [verb, x] = hit;
    return {
      answer: `Your results say **${verb} ${word(x).toLowerCase()}**.\n- Why: ${x.split(":").slice(1).join(":").trim().split("; ").join("\n- ")}`,
      followups: ["What should I look for on labels?", "Explain my routine simply", "What matters most for my hair?"],
    };
  }
  const step = routine.find((r) => q.includes(r.split(":")[0].toLowerCase().split(" ")[0]));
  if (step || /routine|step|wash|how do i/.test(q)) {
    return {
      answer: `Here is your wash-day routine, in order:\n${routine.slice(0, 5).map((r, i) => `${i + 1}. **${r.split(":")[0]}**: ${r.split(":").slice(1).join(":").trim()}`).join("\n")}`,
      followups: ["Why should I avoid these ingredients?", "What should I look for on labels?", "What matters most for my hair?"],
    };
  }
  return {
    answer: `${line("Routine weight:").split(". Headline:")[1]?.trim() || "Here is what matters most for your hair"}.\n${[
      ...seek.slice(0, 2).map((x) => `- **Look for ${word(x).toLowerCase()}**: ${x.split(":").slice(1).join(":").trim().split("; ")[0]}`),
      ...avoid.slice(0, 2).map((x) => `- **Avoid ${word(x).toLowerCase()}**: ${x.split(":").slice(1).join(":").trim().split("; ")[0]}`),
    ].join("\n")}`,
    followups: ["Explain my routine simply", "Why avoid these ingredients?", "What should I look for on labels?"],
  };
}

export async function POST(req: Request) {
  let ctx: string | undefined, qText = "";
  try {
    const { context, question, history, lang } = (await req.json()) as {
      context?: string;
      lang?: string;
      question: string;
      history?: { role: "user" | "coach"; text: string }[];
    };
    ctx = context;
    qText = String(question || "");
    const convo = (history || []).slice(-6).map((h) => `${h.role === "user" ? "User" : "Coach"}: ${h.text}`).join("\n");
    const grounded = !!context?.trim();
    const raw = await generate(
      `${grounded ? `MEASURED HAIR PROFILE AND RULE-ENGINE OUTPUT:\n${context}\n\n` : "NO PROFILE YET (user has not scanned).\n\n"}${convo ? `CONVERSATION SO FAR:\n${convo}\n\n` : ""}User: ${String(question).slice(0, 800)}\nCoach:`,
      {
        system: [
          "You are StrandLab's hair-care coach.",
          ABOUT,
          grounded
            ? "Ground every answer in the measured profile given; cite the measurement that drives advice (e.g. 'your frizz scored 2/3'). Never invent measurements."
            : "Give general guidance. When advice depends on the person's hair, briefly suggest running a StrandLab scan for a personal answer.",
          "Cosmetic advice only: for hair loss, scalp pain, sudden shedding or irritation, recommend a dermatologist.",
          STYLE,
          // Language: an explicit choice wins; otherwise mirror the user. Keep JSON keys in English.
          langById(lang).name
            ? `LANGUAGE: Write "answer" and every "followups" item in ${langById(lang).name}, whatever language the question is in. Keep ingredient INCI names (e.g. glycerin) recognisable, adding the local word in brackets if common.`
            : `LANGUAGE: Write "answer" and "followups" in the same language as the user's latest message (e.g. Hindi in, Hindi out; Hinglish in, Hinglish out). Default to English.`,
        ].join("\n\n"),
        json: true,
      },
    );
    let answer = raw;
    let followups: string[] = [];
    try {
      const j = JSON.parse(raw);
      if (typeof j.answer === "string" && j.answer.trim()) answer = j.answer;
      if (Array.isArray(j.followups)) followups = j.followups.filter((x: unknown) => typeof x === "string" && x.trim()).slice(0, 3);
    } catch {
      /* model returned plain text — show it as-is */
    }
    return NextResponse.json({ answer, followups });
  } catch {
    // Gemini quota / outage: still answer, from the rule engine's output.
    return NextResponse.json({ ...fallback(ctx, qText), fallback: true });
  }
}
