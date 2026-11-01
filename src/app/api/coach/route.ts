// POST { context?, question, history } -> short, well-structured answer from Gemini.
// With context: grounded in the measured profile + rule-engine output. Without: general hair-care help.
import { NextResponse } from "next/server";
import { generate } from "@/lib/gemini";

export const runtime = "nodejs";

const STYLE = `FORMAT (strict):
- Start with one short sentence that directly answers the question.
- Then 2–5 bullet points ("- ") or numbered steps ("1. ") — one idea each, max ~20 words per bullet.
- Use **bold** only for 1–3 key terms. No headings, no tables, no emojis.
- Max 130 words total. Plain, friendly language a non-expert understands; explain jargon in brackets the first time.`;

const ABOUT = `About StrandLab (the app you live in): users take 4 photos; YouCam Hair AI measures curl pattern (1–4C), frizz (0–3), density (0–3) and length. A porosity quiz and the local dew point are added. A rule engine scores 14 ingredient families, ranks products, checks pasted ingredient labels, and shows a realistic vs "ad promise" hair preview.`;

export async function POST(req: Request) {
  try {
    const { context, question, history } = (await req.json()) as {
      context?: string;
      question: string;
      history?: { role: "user" | "coach"; text: string }[];
    };
    const convo = (history || []).slice(-6).map((h) => `${h.role === "user" ? "User" : "Coach"}: ${h.text}`).join("\n");
    const grounded = !!context?.trim();
    const answer = await generate(
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
        ].join("\n\n"),
      },
    );
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
