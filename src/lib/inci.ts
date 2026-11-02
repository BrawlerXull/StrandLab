// Deterministic INCI → ingredient-family classifier. No AI call: instant, free, and identical every time.
// Used by the store widget (runs in the browser, so badges cost nothing per page view) and as the fallback
// when Gemini is unavailable or rate-limited.
import type { Tag } from "./types";

export type Classified = { product_guess: string; weight: "light" | "medium" | "rich"; tags: { tag: Tag; ingredients: string[] }[]; engine: "rules" };

const FATTY = /\b(cetyl|cetearyl|stearyl|behenyl|myristyl|arachidyl|lauryl|oleyl)\s+alcohol\b/i;

// Order matters only for readability; each ingredient can hit several families.
const RULES: [Tag, RegExp][] = [
  ["sulfate", /(lauryl|laureth|myreth|coco|cocoyl)\s*sul(f|ph)ate|olefin\s*sulfonate|\bammonium\s+lauryl/i],
  ["gentle_cleanser", /cocamidopropyl\s+(betaine|hydroxysultaine)|(decyl|coco|lauryl|caprylyl\/capryl)\s*-?glucoside|cocoyl\s+isethionate|lauroyl\s+(methyl\s+)?isethionate|cocoamphoacetate|cocoamphodiacetate|lauroyl\s+sarcosinate|cocoyl\s+glutamate/i],
  ["humectant", /\bglycerin\b|\bglycerol\b|\baloe\b|\bhoney\b|\bmel\b|propanediol|sorbitol|sodium\s+pca|sodium\s+lactate|hyaluron|butylene\s+glycol|propylene\s+glycol|agave|^\s*betaine\s*$/i],
  ["protein", /hydroly[sz]ed\s+[\w\s-]*?(protein|keratin|collagen|silk|wheat|rice|soy|quinoa|oat|pea|baobab|elastin)|\bkeratin\b|amino\s+acids|silk\s+(amino|protein)/i],
  ["ceramide", /ceramide|phytosphingosine|sphingo/i],
  ["heavy_butter", /\bbutter\b|butyrospermum|theobroma\s+cacao\s+(seed\s+)?butter|mangifera\s+indica\s+(seed\s+)?butter|\bshea\b/i],
  ["heavy_oil", /cocos\s+nucifera|coconut\s+oil|ricinus|castor|olea\s+europaea|olive\s+(fruit\s+)?oil|persea\s+gratissima|avocado\s+oil|mineral\s+oil|paraffinum\s+liquidum|petrolatum/i],
  ["light_oil", /argan|argania|simmondsia|jojoba|grapeseed|vitis\s+vinifera\s+seed\s+oil|prunus\s+amygdalus|sweet\s+almond|camellia|squalane|marula|sclerocarya|caprylic\/capric\s+triglyceride|rosa\s+canina|baobab\s+seed\s+oil|moringa/i],
  ["soluble_silicone", /\b(peg|ppg)-\d+[^,]*?(dimethicone|siloxane)|dimethicone\s+copolyol|bis-peg/i],
  ["insoluble_silicone", /amodimethicone|\bdimethicone\b|dimethiconol|cyclopentasiloxane|cyclomethicone|cyclohexasiloxane|phenyl\s+trimethicone|\btrimethicone\b/i],
  ["film_former", /polyquaternium|\bpvp\b|\bvp\/va|linum\s+usitatissimum|flax\s*seed|acrylates\s+copolymer|guar\s+hydroxypropyltrimonium|vinyl\s+caprolactam/i],
  ["drying_alcohol", /alcohol\s+denat|\bsd\s+alcohol|isopropyl\s+alcohol|\bethanol\b|^\s*alcohol\s*$|propanol/i],
  ["fatty_alcohol", FATTY],
  ["panthenol", /panthenol|pro-?vitamin\s+b5/i],
];

/** Split an INCI list on commas that are not inside brackets. */
export function splitInci(text: string): string[] {
  const out: string[] = [];
  let depth = 0,
    cur = "";
  for (const ch of text.replace(/^\s*(ingredients|ingrédients|inhaltsstoffe|ingredientes)\s*[:：]/i, "")) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === "•" || ch === ";") && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim().replace(/\.$/, ""));
  return out.slice(0, 80);
}

export function classifyInci(text: string, name = ""): Classified {
  const items = splitInci(text);
  const found = new Map<Tag, string[]>();
  items.forEach((raw, i) => {
    for (const [tag, re] of RULES) {
      if (!re.test(raw)) continue;
      if (tag === "drying_alcohol" && FATTY.test(raw)) continue; // cetearyl alcohol is not drying
      if (tag === "insoluble_silicone" && RULES.find(([t]) => t === "soluble_silicone")![1].test(raw)) continue;
      if (tag === "humectant" && i >= 8) continue; // only counts when it's a main ingredient (same rule as the AI prompt)
      found.set(tag, [...(found.get(tag) || []), raw]);
    }
  });
  const has = (t: Tag) => found.has(t);
  const pos = (t: Tag) => items.findIndex((x) => found.get(t)?.includes(x));
  const weight: Classified["weight"] =
    has("heavy_butter") || (has("heavy_oil") && pos("heavy_oil") < 5) ? "rich" : !has("fatty_alcohol") && !has("heavy_oil") && !has("insoluble_silicone") ? "light" : "medium";
  const n = name.toLowerCase();
  const guess =
    /shampoo|wash|cleanse/.test(n) || ((has("sulfate") || has("gentle_cleanser")) && Math.min(...(["sulfate", "gentle_cleanser"] as Tag[]).filter(has).map(pos)) < 4)
      ? "shampoo / cleanser"
      : /mask|treatment/.test(n)
        ? "treatment mask"
        : /gel|mousse|custard/.test(n) || (has("film_former") && !has("fatty_alcohol"))
          ? "styler"
          : /condition|cream|leave/.test(n) || has("fatty_alcohol")
            ? "conditioner / cream"
            : "hair product";
  return { product_guess: guess, weight, tags: Array.from(found.entries()).map(([tag, ingredients]) => ({ tag, ingredients })), engine: "rules" };
}
