// POST { audio: "data:audio/wav;base64,…", lang? } -> { text }
// Voice input for the coach. Recording happens in the browser (MediaRecorder → 16 kHz mono WAV) and Gemini
// transcribes it, so it works in every modern browser instead of relying on Chrome's Web Speech service.
import { NextResponse } from "next/server";
import { generate } from "@/lib/gemini";
import { langById } from "@/lib/langs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { audio, lang } = (await req.json()) as { audio?: string; lang?: string };
    const m = /^data:(audio\/(?:wav|x-wav|webm|ogg|mp4|mpeg|aac|flac));base64,(.+)$/.exec(String(audio || ""));
    if (!m) return NextResponse.json({ error: "No audio received" }, { status: 400 });
    if (m[2].length > 3_500_000) return NextResponse.json({ error: "Recording is too long — keep it under 30 seconds" }, { status: 413 });
    const hint = langById(lang).name;
    const raw = await generate(
      `Transcribe the speech in this audio exactly as spoken, in its original language and script${hint ? ` (it is probably ${hint})` : ""}. ` +
        `Do not translate, answer or summarise it. If there is no intelligible speech, return an empty string. Return JSON {"text": string}.`,
      { json: true, system: "You are a precise speech-to-text engine. Output strict JSON only.", images: [{ mime: m[1] === "audio/x-wav" ? "audio/wav" : m[1], data: m[2] }] },
    );
    let text = "";
    try {
      text = String(JSON.parse(raw).text || "").trim();
    } catch {
      text = raw.trim();
    }
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
