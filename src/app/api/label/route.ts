// POST { ingredients } -> Gemini maps the INCI list to rule-engine tags (scoring itself stays deterministic, client-side).
import { NextResponse } from "next/server";
import { cached, hash } from "@/lib/cache";
import { generate } from "@/lib/gemini";
import { TAG_INFO } from "@/lib/rules";
import type { Tag } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const tagList = () => (Object.keys(TAG_INFO) as Tag[]).map((t) => `- ${t}: ${TAG_INFO[t].label} (e.g. ${TAG_INFO[t].examples})`).join("\n");
const SCHEMA = `"product_guess": string (e.g. "styling gel"), "weight": "light"|"medium"|"rich", "tags": [{"tag": one of the tag keys, "ingredients": [exact names from the list]}]`;
const RULES = `Only use tags that are clearly present. "humectant" only if glycerin/aloe/honey/propanediol/sorbitol etc. appear in the first ~8 ingredients.`;

function clean(j: { product_guess?: unknown; weight?: unknown; tags?: { tag: string }[] }) {
  const tags = (j.tags || []).filter((t) => t && t.tag in TAG_INFO);
  return { product_guess: String(j.product_guess || "hair product"), weight: ["light", "medium", "rich"].includes(String(j.weight)) ? j.weight : "medium", tags };
}

export async function POST(req: Request) {
  try {
    const { ingredients, image } = (await req.json()) as { ingredients?: string; image?: string };

    // Photo of the label: Gemini reads the ingredient list (OCR) and classifies it in one call.
    if (image) {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(image));
      if (!m) return NextResponse.json({ error: "Unsupported image" }, { status: 400 });
      if (m[2].length > 4_000_000) return NextResponse.json({ error: "Photo is too large" }, { status: 413 });
      const out = await cached("lblimg-" + hash(m[2]), async () => {
        const raw = await generate(
          `This is a photo of a hair-care product. Find the INGREDIENTS list (INCI; may be labelled "Ingredients", "Ingrédients", "Inhaltsstoffe", "Ingredientes" etc.) and transcribe it exactly, in order.\n\nTags:\n${tagList()}\n\nReturn JSON: {"found": boolean (false if no ingredient list is readable), "ingredients_text": string (comma-separated INCI list as printed), ${SCHEMA}}.\n${RULES}\nIf the photo shows the front of the bottle only, set found=false.`,
          { json: true, system: "You are a cosmetic chemist reading product labels. Output strict JSON only.", images: [{ mime: m[1], data: m[2] }] },
        );
        const j = JSON.parse(raw);
        return { found: !!j.found && String(j.ingredients_text || "").length > 8, ingredients_text: String(j.ingredients_text || "").slice(0, 4000), ...clean(j) };
      });
      if (!out.found) return NextResponse.json({ error: "Couldn't read an ingredient list. Photograph the back of the bottle where it says “Ingredients”, close up and in focus." }, { status: 422 });
      return NextResponse.json(out);
    }

    const text = String(ingredients || "").slice(0, 4000).trim();
    if (text.length < 8) return NextResponse.json({ error: "Paste the ingredient list from the label" }, { status: 400 });
    const out = await cached("lbl-" + hash(text), async () => {
      const raw = await generate(
        `Classify this hair-product ingredient list (INCI).\n\nTags:\n${tagList()}\n\nReturn JSON: {${SCHEMA}}.\n${RULES}\n\nIngredients:\n${text}`,
        { json: true, system: "You are a cosmetic chemist. Output strict JSON only." },
      );
      return clean(JSON.parse(raw));
    });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
