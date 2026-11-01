// POST multipart: front/right/left/tilt images + boxes JSON -> measured hair profile (4 YouCam detectors).
import { NextResponse } from "next/server";
import { cached, hash } from "@/lib/cache";
import { diagnose, type Photos } from "@/lib/diagnose";
import { normalize } from "@/lib/frame";
import { SHOTS, type FaceBox } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const boxes = JSON.parse(String(form.get("boxes") || "{}")) as Record<string, FaceBox | null>;
    const photos = {} as Photos;
    for (const s of SHOTS) {
      const f = form.get(s);
      if (!(f instanceof Blob)) return NextResponse.json({ error: `Missing ${s} photo` }, { status: 400 });
      photos[s] = { buf: await normalize(Buffer.from(await f.arrayBuffer())), box: boxes[s] ?? null };
    }
    const key = "dx-" + hash(...SHOTS.map((s) => photos[s].buf), JSON.stringify(boxes));
    const measured = await cached(key, () => diagnose(photos));
    return NextResponse.json({ measured });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
