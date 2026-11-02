// Shared logic for the embeddable store widget (public/widget.js ↔ /widget iframe ↔ /connect popup).
import { scoreProduct } from "./catalog";
import { recommend, TAG_INFO } from "./rules";
import type { Profile, Rec, Tag } from "./types";

export type ParsedLabel = { product_guess: string; weight: "light" | "medium" | "rich"; tags: { tag: Tag; ingredients: string[] }[] };
export type WidgetProduct = { id?: string; name?: string; ingredients?: string };

/** What the store receives (CustomEvent "strandlab:result" detail). No photos, only the derived summary. */
export type WidgetResult = {
  product: null | {
    id?: string;
    name?: string;
    match: number;
    verdict: "great" | "ok" | "skip";
    verdictLabel: string;
    pros: string[];
    cons: string[];
    detected: string[];
  };
  profile: {
    curlPattern: string | null;
    curlFamily: string | null;
    frizz: number | null;
    density: string | null;
    length: string | null;
    porosity: string;
    dewPointC: number | null;
    source: "measured" | "self-reported" | "sample";
  };
  routineWeight: Rec["weight"];
  lookFor: string[];
  avoid: string[];
};

export const PROFILE_KEY = "sl-widget-profile";
/** First-party copy of the user's latest StrandLab profile (read by /connect to share with a shop). */
export const LAST_PROFILE_KEY = "strandlab.lastProfile";
/** Session flag: this tab was opened from a store widget, so results offer "send back to the shop". */
export const RETURN_KEY = "sl-return";

export function verdictOf(match: number): { verdict: "great" | "ok" | "skip"; label: string } {
  return match >= 70 ? { verdict: "great", label: "Great match" } : match >= 45 ? { verdict: "ok", label: "Okay, with caveats" } : { verdict: "skip", label: "Not a good fit" };
}

export function summarize(profile: Profile, source: WidgetResult["profile"]["source"], product?: WidgetProduct, parsed?: ParsedLabel): WidgetResult {
  const rec = recommend(profile);
  const tags = Object.values(rec.tags) as Rec["tags"][Tag][];
  const m = profile.measured;
  let prod: WidgetResult["product"] = null;
  if (product && parsed) {
    const s = scoreProduct({ tags: parsed.tags.map((t) => t.tag), weight: parsed.weight }, rec);
    const v = verdictOf(s.match);
    prod = {
      id: product.id,
      name: product.name || parsed.product_guess,
      match: s.match,
      verdict: v.verdict,
      verdictLabel: v.label,
      pros: s.pros,
      cons: s.cons,
      detected: parsed.tags.map((t) => TAG_INFO[t.tag].label),
    };
  }
  return {
    product: prod,
    profile: {
      curlPattern: m.type?.mapping.toUpperCase() ?? null,
      curlFamily: m.type?.family ?? null,
      frizz: m.frizz?.level ?? null,
      density: m.density?.term ?? null,
      length: m.length?.term ?? null,
      porosity: profile.porosity,
      dewPointC: profile.climate ? Math.round(profile.climate.dewPointC) : null,
      source,
    },
    routineWeight: rec.weight,
    lookFor: tags.filter((t) => t.score >= 2).sort((a, b) => b.score - a.score).map((t) => TAG_INFO[t.tag].label),
    avoid: tags.filter((t) => t.score <= -2).sort((a, b) => a.score - b.score).map((t) => TAG_INFO[t.tag].label),
  };
}
