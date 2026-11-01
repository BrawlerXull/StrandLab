// POST multipart: photos + face boxes (+ optional `part`) -> measured hair profile.
// With `part` = curl | length | density only that detector group runs (the browser fires all three in
// parallel so each gets its own time budget and the UI can show live progress). Without it, all run.
import { NextResponse } from "next/server";
import { cached, hash } from "@/lib/cache";
import { diagnose, PARTS, type Photos } from "@/lib/diagnose";
import { normalize } from "@/lib/frame";
import { PART_LIST, SHOTS, type FaceBox, type Part } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const part = (form.get("part") as Part | null) || null;
    if (part && !PART_LIST.includes(part)) return NextResponse.json({ error: "Unknown part" }, { status: 400 });
    const boxes = JSON.parse(String(form.get("boxes") || "{}")) as Record<string, FaceBox | null>;
    const needed = part ? PARTS[part].shots : SHOTS;
    const photos: Photos = {};
    for (const s of SHOTS) {
      const f = form.get(s);
      if (f instanceof Blob) photos[s] = { buf: await normalize(Buffer.from(await f.arrayBuffer())), box: boxes[s] ?? null };
    }
    const missing = needed.filter((s) => !photos[s] && !(part === "density" && s === "right"));
    if (missing.length) return NextResponse.json({ error: `Missing ${missing.join(", ")} photo` }, { status: 400 });

    const key = (part || "all") + "-" + hash(...needed.filter((s) => photos[s]).map((s) => photos[s]!.buf), JSON.stringify(boxes));
    if (part) {
      const result = await cached("p2-" + key, () => PARTS[part].run(photos));
      return NextResponse.json({ part, result });
    }
    const measured = await cached("dx2-" + key, () => diagnose(photos));
    return NextResponse.json({ measured });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
