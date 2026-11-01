// Demo catalogue (fictional "Strand & Co." house products — not real brands) + deterministic scoring.
import type { Category, Product, Rec, ScoredProduct, Tag } from "./types";
import { TAG_INFO } from "./rules";

const P = (p: Product) => p;

export const CATALOG: Product[] = [
  // Shampoo
  P({ id: "sh-clarify", name: "Reset Clarifying Wash", category: "shampoo", price: 14, weight: "light", tags: ["sulfate"], keyIngredients: ["Sodium laureth sulfate", "Citric acid"], blurb: "Deep clean that removes build-up. Monthly use.", hue: "#9DB8C4" }),
  P({ id: "sh-curl", name: "Low-Lather Curl Cleanser", category: "shampoo", price: 18, weight: "medium", tags: ["gentle_cleanser", "humectant", "fatty_alcohol"], keyIngredients: ["Cocamidopropyl betaine", "Glycerin", "Cetearyl alcohol"], blurb: "Cream cleanser that keeps curls' natural oils.", hue: "#D8B48A" }),
  P({ id: "sh-volume", name: "Root Lift Shampoo", category: "shampoo", price: 16, weight: "light", tags: ["gentle_cleanser", "protein", "panthenol"], keyIngredients: ["Decyl glucoside", "Hydrolysed rice protein", "Panthenol"], blurb: "Weightless clean with body-building protein.", hue: "#C9D6C2" }),
  P({ id: "sh-dry", name: "Humid-Day Gentle Wash", category: "shampoo", price: 17, weight: "light", tags: ["gentle_cleanser", "panthenol"], keyIngredients: ["Coco-glucoside", "Panthenol"], blurb: "Glycerin-free cleanser for any climate.", hue: "#BFD3D6" }),
  // Conditioner
  P({ id: "co-light", name: "Featherweight Conditioner", category: "conditioner", price: 16, weight: "light", tags: ["fatty_alcohol", "panthenol", "soluble_silicone"], keyIngredients: ["Cetyl alcohol", "Panthenol", "PEG-12 dimethicone"], blurb: "Slip without the weight. Rinses clean.", hue: "#E6DCC8" }),
  P({ id: "co-slip", name: "Detangle Slip Conditioner", category: "conditioner", price: 19, weight: "medium", tags: ["fatty_alcohol", "humectant", "light_oil"], keyIngredients: ["Behentrimonium methosulfate", "Glycerin", "Argan oil"], blurb: "Huge slip for finger-detangling curls.", hue: "#D9C29A" }),
  P({ id: "co-rich", name: "Butter-Rich Conditioner", category: "conditioner", price: 21, weight: "rich", tags: ["fatty_alcohol", "heavy_butter", "heavy_oil"], keyIngredients: ["Cetearyl alcohol", "Shea butter", "Castor oil"], blurb: "Maximum moisture for coils.", hue: "#B98C5E" }),
  P({ id: "co-bond", name: "Ceramide Repair Conditioner", category: "conditioner", price: 24, weight: "medium", tags: ["fatty_alcohol", "ceramide", "protein", "insoluble_silicone"], keyIngredients: ["Ceramide NP", "Hydrolysed keratin", "Amodimethicone"], blurb: "Refills gaps in porous, damaged strands.", hue: "#C7A9B6" }),
  // Leave-in
  P({ id: "li-mist", name: "Weightless Leave-in Mist", category: "leave-in", price: 15, weight: "light", tags: ["panthenol", "humectant"], keyIngredients: ["Panthenol", "Aloe juice", "Propanediol"], blurb: "Spray-on moisture for fine hair.", hue: "#CFE2DA" }),
  P({ id: "li-cream", name: "Curl Cream Leave-in", category: "leave-in", price: 20, weight: "medium", tags: ["fatty_alcohol", "light_oil", "film_former"], keyIngredients: ["Cetearyl alcohol", "Jojoba oil", "Polyquaternium-11"], blurb: "Clumps curls, glycerin-free.", hue: "#E2C9A6" }),
  P({ id: "li-butter", name: "Coil Butter Leave-in", category: "leave-in", price: 22, weight: "rich", tags: ["heavy_butter", "heavy_oil", "humectant", "fatty_alcohol"], keyIngredients: ["Mango butter", "Coconut oil", "Glycerin"], blurb: "Dense moisture to seal coils (LCO).", hue: "#A87F55" }),
  P({ id: "li-protein", name: "Strength Leave-in", category: "leave-in", price: 19, weight: "light", tags: ["protein", "ceramide", "panthenol"], keyIngredients: ["Hydrolysed silk", "Phytosphingosine", "Panthenol"], blurb: "Light protein for porous or limp hair.", hue: "#D7CFE4" }),
  // Styler
  P({ id: "st-gel", name: "Hard-Hold Curl Gel", category: "styler", price: 17, weight: "light", tags: ["film_former", "humectant"], keyIngredients: ["Polyquaternium-10", "Glycerin", "Flaxseed extract"], blurb: "Crunchy cast, scrunch out when dry.", hue: "#B9D4C8" }),
  P({ id: "st-humid", name: "Anti-Humidity Gel", category: "styler", price: 19, weight: "light", tags: ["film_former", "soluble_silicone"], keyIngredients: ["PVP", "Polyquaternium-69", "PEG-8 dimethicone"], blurb: "Glycerin-free hold for sticky weather.", hue: "#9FC3C1" }),
  P({ id: "st-mousse", name: "Wave Mousse", category: "styler", price: 16, weight: "light", tags: ["film_former", "panthenol", "drying_alcohol"], keyIngredients: ["Polyquaternium-4", "Panthenol", "Alcohol denat."], blurb: "Airy hold for waves and root lift.", hue: "#E3E1D2" }),
  P({ id: "st-cream", name: "Defining Custard", category: "styler", price: 21, weight: "rich", tags: ["heavy_butter", "film_former", "humectant"], keyIngredients: ["Shea butter", "Polyquaternium-37", "Honey"], blurb: "Soft definition for thick curls and coils.", hue: "#C8A070" }),
  P({ id: "st-serum", name: "Smoothing Serum", category: "styler", price: 18, weight: "light", tags: ["insoluble_silicone", "light_oil"], keyIngredients: ["Dimethicone", "Argan oil"], blurb: "Seals the cuticle, adds shine.", hue: "#E8D7A8" }),
  // Treatment
  P({ id: "tr-protein", name: "Protein Rebuild Mask", category: "treatment", price: 24, weight: "medium", tags: ["protein", "ceramide", "fatty_alcohol"], keyIngredients: ["Hydrolysed keratin", "Ceramide NP", "Cetyl alcohol"], blurb: "Weekly patch-up for high-porosity hair.", hue: "#CDB5C9" }),
  P({ id: "tr-moist", name: "Steam-Activated Moisture Mask", category: "treatment", price: 22, weight: "light", tags: ["humectant", "light_oil", "panthenol"], keyIngredients: ["Glycerin", "Grapeseed oil", "Panthenol"], blurb: "Use with heat for low-porosity hair.", hue: "#BCD8D0" }),
  P({ id: "tr-oil", name: "Pre-Wash Oil Treatment", category: "treatment", price: 20, weight: "rich", tags: ["heavy_oil", "light_oil"], keyIngredients: ["Coconut oil", "Jojoba oil"], blurb: "Pre-poo for long or dry ends.", hue: "#D6B57C" }),
];

const WEIGHTS = { light: 0, medium: 1, rich: 2 } as const;

export function scoreProduct(p: Pick<Product, "tags" | "weight">, rec: Rec): { match: number; pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  let s = 0;
  for (const tag of p.tags as Tag[]) {
    const r = rec.tags[tag];
    if (!r || r.score === 0) continue;
    s += r.score;
    (r.score > 0 ? pros : cons).push(`${TAG_INFO[tag].label}: ${r.why[0]}`);
  }
  const gap = Math.abs(WEIGHTS[p.weight] - WEIGHTS[rec.weight]);
  if (gap === 0) {
    s += 1;
    pros.push(`${cap(p.weight)} texture matches the ${rec.weight} routine your profile calls for`);
  } else if (gap === 2) {
    s -= 2;
    cons.push(`${cap(p.weight)} texture vs the ${rec.weight} routine you need`);
  }
  const match = Math.round(Math.max(3, Math.min(99, 55 + s * 9)));
  return { match, pros, cons };
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export const CATEGORIES: Category[] = ["shampoo", "conditioner", "leave-in", "styler", "treatment"];

export function shortlist(rec: Rec): Record<Category, ScoredProduct[]> {
  const out = {} as Record<Category, ScoredProduct[]>;
  for (const c of CATEGORIES) {
    out[c] = CATALOG.filter((p) => p.category === c)
      .map((p) => ({ ...p, ...scoreProduct(p, rec) }))
      .sort((a, b) => b.match - a.match);
  }
  return out;
}
