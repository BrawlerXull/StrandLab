// POST { profile summary, question, history } -> short grounded answer from Gemini.
import { NextResponse } from "next/server";
import { generate } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { context, question, history } = (await req.json()) as {
      context: string;
      question: string;
      history?: { role: "user" | "coach"; text: string }[];
    };
    const convo = (history || []).slice(-6).map((h) => `${h.role === "user" ? "User" : "Coach"}: ${h.text}`).join("\n");
    const answer = await generate(
      `MEASURED HAIR PROFILE AND RULE-ENGINE OUTPUT:\n${context}\n\n${convo ? `CONVERSATION:\n${convo}\n\n` : ""}User: ${String(question).slice(0, 800)}\nCoach:`,
      {
        system:
          "You are StrandLab's hair-care coach. Ground every answer in the measured profile and the rule-engine output given; cite the measurement that drives your advice (e.g. 'because your frizz scored 2/3'). Be concise: max 120 words, plain language, practical steps. Cosmetic advice only: for hair loss, scalp pain or sudden shedding recommend a dermatologist. Never invent measurements. Plain text only — no markdown, no asterisks; put steps on separate lines starting with 1., 2., …",
      },
    );
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
