// POST multipart: image + feature + template -> YouCam hair VTO result (data URL). Cached per image+template.
import { NextResponse } from "next/server";
import { cached, hash } from "@/lib/cache";
import { normalize } from "@/lib/frame";
import { ALL_TEMPLATES } from "@/lib/rules";
import { hairVto, toDataUrl, type VtoFeature } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const feature = String(form.get("feature")) as VtoFeature;
    const template = String(form.get("template"));
    if (!ALL_TEMPLATES.some((t) => t.feature === feature && t.template === template))
      return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    const f = form.get("image");
    if (!(f instanceof Blob)) return NextResponse.json({ error: "Missing image" }, { status: 400 });
    const img = await normalize(Buffer.from(await f.arrayBuffer()), 1024);
    const url = await cached("vto-" + hash(img, feature, template), async () => toDataUrl(await hairVto(feature, img, template)));
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
