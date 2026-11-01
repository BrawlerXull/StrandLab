// POST { ingredients } -> Gemini maps the INCI list to rule-engine tags (scoring itself stays deterministic, client-side).
import { NextResponse } from "next/server";
import { cached, hash } from "@/lib/cache";
import { generate } from "@/lib/gemini";
import { TAG_INFO } from "@/lib/rules";
import type { Tag } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { ingredients } = (await req.json()) as { ingredients: string };
    const text = String(ingredients || "").slice(0, 4000).trim();
    if (text.length < 8) return NextResponse.json({ error: "Paste the ingredient list from the label" }, { status: 400 });
    const tagList = (Object.keys(TAG_INFO) as Tag[]).map((t) => `- ${t}: ${TAG_INFO[t].label} (e.g. ${TAG_INFO[t].examples})`).join("\n");
    const out = await cached("lbl-" + hash(text), async () => {
      const raw = await generate(
        `Classify this hair-product ingredient list (INCI).\n\nTags:\n${tagList}\n\nReturn JSON: {"product_guess": string (e.g. "styling gel"), "weight": "light"|"medium"|"rich", "tags": [{"tag": one of the tag keys, "ingredients": [exact names from the list]}]}.\nOnly use tags that are clearly present. "humectant" only if glycerin/aloe/honey/propanediol/sorbitol etc. appear in the first ~8 ingredients.\n\nIngredients:\n${text}`,
        { json: true, system: "You are a cosmetic chemist. Output strict JSON only." },
      );
      const j = JSON.parse(raw);
      const tags = (j.tags || []).filter((t: { tag: string }) => t.tag in TAG_INFO);
      return { product_guess: String(j.product_guess || "hair product"), weight: ["light", "medium", "rich"].includes(j.weight) ? j.weight : "medium", tags };
    });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
