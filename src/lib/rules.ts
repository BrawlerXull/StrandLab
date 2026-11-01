// Hair-care rule engine. Pure functions, shared by server and browser.
// Inputs: measured curl pattern / frizz / density / length (YouCam) + porosity (quiz) + dew point (weather).
// Output: ingredient tags to seek/avoid, each with human-readable receipts, plus a routine.
// Cosmetic guidance only — the rules encode widely used stylist / curly-method heuristics.
import type { Climate, CurlFamily, Measured, PreviewPlan, Profile, Rec, Tag, TagRule } from "./types";

export const TYPE_MAPPINGS = ["1 to 2a", "2a to 2b", "2b to 2c", "2c to 3a", "3a to 3b", "3b to 3c", "3c to 4a", "4a to 4b", "4b to 4c"];

export function familyOf(index: number): CurlFamily {
  if (index <= 0) return "straight";
  if (index <= 3) return "wavy";
  if (index <= 5) return "curly";
  return "coily";
}

export function lengthBand(term: string): "short" | "medium" | "long" {
  if (/above the ears|ear length$|short hair$/i.test(term)) return "short";
  if (/long hair|above chest or longer/i.test(term)) return "long";
  return "medium";
}

export function dewBand(dp: number): Climate["band"] {
  if (dp < 4) return "dry";
  if (dp > 15) return "humid";
  return "ideal";
}

export const TAG_INFO: Record<Tag, { label: string; examples: string }> = {
  sulfate: { label: "Sulfate cleansers", examples: "sodium lauryl / laureth sulfate" },
  gentle_cleanser: { label: "Gentle cleansers", examples: "cocamidopropyl betaine, decyl glucoside" },
  humectant: { label: "Humectants", examples: "glycerin, aloe, honey, propanediol" },
  protein: { label: "Hydrolysed protein", examples: "keratin, rice, wheat, silk amino acids" },
  ceramide: { label: "Ceramides / lipids", examples: "ceramide NP, phytosphingosine" },
  heavy_butter: { label: "Rich butters", examples: "shea, mango, cocoa butter" },
  heavy_oil: { label: "Heavy oils", examples: "coconut, castor, olive oil" },
  light_oil: { label: "Light oils", examples: "argan, jojoba, grapeseed" },
  insoluble_silicone: { label: "Non-water-soluble silicones", examples: "dimethicone, amodimethicone" },
  soluble_silicone: { label: "Water-soluble silicones", examples: "PEG-/PPG- dimethicone" },
  film_former: { label: "Film-formers / hold", examples: "polyquaternium, PVP, flaxseed gel" },
  drying_alcohol: { label: "Drying alcohols", examples: "alcohol denat., isopropyl alcohol" },
  fatty_alcohol: { label: "Fatty alcohols", examples: "cetyl, cetearyl, behenyl alcohol" },
  panthenol: { label: "Panthenol (pro-vitamin B5)", examples: "D-panthenol" },
};

function emptyTags(): Record<Tag, TagRule> {
  const o = {} as Record<Tag, TagRule>;
  (Object.keys(TAG_INFO) as Tag[]).forEach((t) => (o[t] = { tag: t, score: 0, why: [] }));
  return o;
}

const familyLabel: Record<CurlFamily, string> = { straight: "straight", wavy: "wavy", curly: "curly", coily: "coily" };

export function recommend(p: Profile): Rec {
  const t = emptyTags();
  const add = (tag: Tag, score: number, why: string) => {
    t[tag].score += score;
    t[tag].why.push(why);
  };
  const m = p.measured;
  const fam = m.type?.family ?? "wavy";
  const typeCode = m.type?.mapping.toUpperCase() ?? "?";
  const frizz = m.frizz?.level ?? 1;
  const dens = m.density?.value ?? 1.5;
  const band = p.climate?.band ?? "ideal";
  const dp = p.climate ? `${Math.round(p.climate.dewPointC)}°C dew point` : "";

  // --- Curl pattern ---
  if (fam === "straight" || fam === "wavy") {
    add("heavy_butter", -2, `${typeCode} ${familyLabel[fam]} pattern: butters weigh the pattern down`);
    add("heavy_oil", -1, `${typeCode} pattern: heavy oils flatten roots`);
    add("film_former", fam === "wavy" ? 2 : 1, fam === "wavy" ? `${typeCode} waves need hold (gel / mousse) to clump` : "Light hold keeps volume in place");
    add("panthenol", 1, "Light-weight moisture that does not flatten");
  } else {
    add("fatty_alcohol", 2, `${typeCode} ${familyLabel[fam]} hair needs slip to detangle without breakage`);
    add("sulfate", -2, `${typeCode} pattern: sulfates strip the oils curls rely on`);
    add("gentle_cleanser", 2, `${typeCode} pattern: low-lather cleansers keep curl definition`);
    add("film_former", 1, "Gel cast locks the curl clump");
    if (fam === "coily") {
      add("heavy_butter", 2, `${typeCode} coils lose moisture fastest; butters seal it in`);
      add("heavy_oil", 1, "Sealing oil as the last layer (LCO method)");
    } else {
      add("light_oil", 1, "A few drops of light oil to scrunch out the cast");
    }
  }

  // --- Density (strand count; proxy for how much product hair can carry) ---
  if (dens < 1.5) {
    add("heavy_butter", -2, `${m.density?.term ?? "Low density"}: rich products make hair look sparse`);
    add("heavy_oil", -1, `${m.density?.term ?? "Low density"}: keep oils to the ends`);
    add("insoluble_silicone", -1, "Low density: silicone build-up flattens roots");
    add("protein", 1, "Protein adds body to low-density hair");
  } else if (dens >= 2.5) {
    add("heavy_butter", 1, `${m.density?.term}: lots of hair can carry richer creams`);
    add("fatty_alcohol", 1, `${m.density?.term}: extra slip saves detangling time`);
  }

  // --- Frizz ---
  if (frizz >= 2) {
    add("drying_alcohol", -2, `${m.frizz?.term} (${frizz}/3): drying alcohols lift the cuticle and add frizz`);
    add("sulfate", -1, `${m.frizz?.term}: harsh cleansers rough up the cuticle`);
    add("film_former", 1, `${m.frizz?.term}: a film-former holds the cuticle down`);
  }
  if (frizz >= 1) add("panthenol", 1, "Panthenol smooths the cuticle surface");

  // --- Porosity (quiz) ---
  if (p.porosity === "low") {
    add("heavy_butter", -1, "Low porosity: butters sit on top instead of absorbing");
    add("insoluble_silicone", -1, "Low porosity: build-up repels water — needs clarifying");
    add("protein", -1, "Low porosity: protein overload makes strands stiff");
    add("humectant", 1, "Low porosity: water-binding humectants get in where oils can't");
    add("light_oil", 1, "Low porosity: light oils absorb, heavy ones don't");
  } else if (p.porosity === "high") {
    add("protein", 2, "High porosity: protein patches gaps in the cuticle");
    add("ceramide", 2, "High porosity: ceramides refill lost lipids");
    add("heavy_oil", 1, "High porosity: seal moisture in with an oil");
    add("insoluble_silicone", 1, "High porosity: silicones reduce friction damage");
  }

  // --- Climate (dew point decides whether humectants help or hurt) ---
  if (band === "humid") {
    add("humectant", -2, `${dp} (humid): glycerin pulls in excess moisture → hair swells and frizzes`);
    add("film_former", 2, `${dp}: anti-humidity film keeps humidity out`);
    add("insoluble_silicone", frizz >= 2 ? 1 : 0, `${dp}: silicones block humidity`);
  } else if (band === "dry") {
    add("humectant", -2, `${dp} (dry air): glycerin draws water out of the hair → frizz`);
    add("fatty_alcohol", 1, `${dp}: emollients hold water in instead`);
    add("light_oil", 1, `${dp}: seal with oil`);
  } else if (p.climate) {
    add("humectant", 2, `${dp} is the humectant sweet spot: glycerin helps today`);
  }

  // --- Length ---
  const len = m.length?.band ?? "medium";
  if (len === "long") {
    add("fatty_alcohol", 1, `${m.length?.term}: long ends are oldest and need the most slip`);
    add("light_oil", 1, `${m.length?.term}: oil on the ends limits split ends`);
  }

  // Remove neutral reasons (score 0) noise
  (Object.keys(t) as Tag[]).forEach((k) => {
    if (t[k].why.length === 0) t[k].score = 0;
  });

  const weight: Rec["weight"] =
    fam === "coily" || (fam === "curly" && dens >= 2.2 && p.porosity !== "low")
      ? "rich"
      : fam === "straight" || dens < 1.5 || p.porosity === "low"
        ? "light"
        : "medium";

  return { tags: t, weight, routine: routine(p, fam, weight, band), headline: headline(m, weight, band) };
}

function headline(m: Measured, weight: Rec["weight"], band: Climate["band"]) {
  const fam = m.type?.family ?? "wavy";
  const parts = [`${weight === "rich" ? "Rich" : weight === "light" ? "Light-weight" : "Medium-weight"} ${fam} routine`];
  if ((m.frizz?.level ?? 0) >= 2) parts.push("frizz control first");
  if (band === "humid") parts.push("anti-humidity hold");
  if (band === "dry") parts.push("no glycerin while the air is dry");
  return parts.join(" · ");
}

function routine(p: Profile, fam: CurlFamily, weight: Rec["weight"], band: Climate["band"]): Rec["routine"] {
  const frizz = p.measured.frizz?.level ?? 1;
  const r: Rec["routine"] = [];
  r.push(
    fam === "curly" || fam === "coily"
      ? { step: "Cleanse", detail: "Sulfate-free shampoo 1–2× a week; clarify monthly", why: "Curls rely on natural oils; strip less, clarify occasionally to reset build-up" }
      : { step: "Cleanse", detail: "Gentle shampoo every 2–3 days, focus on the scalp", why: "Waves and straight hair get weighed down by oil faster" },
  );
  r.push({
    step: "Condition",
    detail: fam === "straight" ? "Mid-lengths to ends only, rinse fully" : "Detangle with fingers while conditioner is in; rinse out most of it",
    why: fam === "straight" ? "Keeps roots light" : "Slip prevents breakage; leftover conditioner feeds the curl",
  });
  if (p.porosity === "high") r.push({ step: "Weekly treatment", detail: "Protein or ceramide mask, 10 min", why: "High porosity: patches the cuticle" });
  if (p.porosity === "low") r.push({ step: "Weekly treatment", detail: "Deep condition under a warm towel (heat opens the cuticle)", why: "Low porosity resists absorbing product at room temperature" });
  if (fam !== "straight")
    r.push({
      step: weight === "rich" ? "Leave-in + cream (LCO)" : "Leave-in (light)",
      detail: "Apply on soaking-wet hair, rake through, then scrunch",
      why: "Soaking-wet hair forms clumps and frizzes less",
    });
  r.push({
    step: "Style",
    detail:
      fam === "straight"
        ? "Root-lift mousse, blow-dry upside down"
        : band === "humid"
          ? "Strong-hold gel, glycerin-free, scrunch out the crunch when dry"
          : fam === "wavy"
            ? "Mousse or light gel, plop 15 min, diffuse low"
            : "Gel over cream, don't touch until fully dry",
    why: fam === "straight" ? "Volume comes from the root" : frizz >= 2 ? "A hold layer that dries undisturbed is the main frizz fix" : "Hold sets the pattern",
  });
  if (frizz >= 2) r.push({ step: "Protect", detail: "Satin pillowcase or bonnet, microfibre towel", why: "Cotton friction is a top cause of frizz" });
  return r;
}

/** Which try-on templates show the realistic result vs the advertising promise. */
export function previewPlan(m: Measured, presentation: "feminine" | "masculine"): PreviewPlan {
  const fam = m.type?.family ?? "wavy";
  if (presentation === "masculine")
    return {
      feature: "hair-curl",
      realistic: { template: "male_classic_wavy", label: "Defined waves" },
      promise: { template: "male_classic_wavy", label: "Defined waves" },
      why: "YouCam offers one masculine wave template.",
    };
  if (fam === "wavy")
    return {
      feature: "hair-curl",
      realistic: { template: "female_subtle_waves_", label: "Subtle, defined waves" },
      promise: { template: "female_defined_waves_", label: "Ad-campaign waves" },
      why: "Wave definition is the realistic win for a wavy pattern with hold products.",
    };
  return {
    feature: "hair-vol",
    realistic: { template: fam === "straight" ? "female_natural" : "female_subtle", label: fam === "straight" ? "Natural lift" : "Fuller, defined curls" },
    promise: { template: "female_maximized", label: "Ad-campaign volume" },
    why: fam === "straight" ? "Root lift is what a volumising routine can actually deliver." : "Better clumping reads as fuller, calmer curls.",
  };
}

export const ALL_TEMPLATES: { feature: "hair-vol" | "hair-curl"; template: string; label: string }[] = [
  { feature: "hair-vol", template: "female_subtle", label: "Volume · subtle" },
  { feature: "hair-vol", template: "female_natural", label: "Volume · natural" },
  { feature: "hair-vol", template: "female_medium", label: "Volume · medium" },
  { feature: "hair-vol", template: "female_high", label: "Volume · high" },
  { feature: "hair-vol", template: "female_maximized", label: "Volume · maximized" },
  { feature: "hair-curl", template: "female_subtle_waves_", label: "Waves · subtle" },
  { feature: "hair-curl", template: "female_loose_waves_", label: "Waves · loose" },
  { feature: "hair-curl", template: "female_beach_waves_", label: "Waves · beach" },
  { feature: "hair-curl", template: "female_defined_waves_", label: "Waves · defined" },
  { feature: "hair-curl", template: "male_classic_wavy", label: "Waves · classic (masc.)" },
];
