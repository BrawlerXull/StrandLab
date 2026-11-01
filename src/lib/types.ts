// Shared types (client + server).

/** Face bounding box as fractions of the image (0..1). */
export type FaceBox = { x: number; y: number; w: number; h: number };

export type Shot = "front" | "right" | "left" | "tilt";
export const SHOTS: Shot[] = ["front", "right", "left", "tilt"];

export type CurlFamily = "straight" | "wavy" | "curly" | "coily";

/** What the four YouCam detectors measured. */
export type Measured = {
  type: { mapping: string; term: string; index: number; family: CurlFamily } | null;
  frizz: { level: number; term: string } | null;
  density: { value: number; term: string } | null;
  length: { term: string; band: "short" | "medium" | "long" } | null;
  /** Per-detector problems, so the UI can show which photo to retake. */
  issues: { detector: string; code: string; hint: string }[];
  /** How the auto-framer had to crop for each detector (shown as a technical receipt). */
  framing: Record<string, string>;
};

export type Porosity = "low" | "normal" | "high";

export type Climate = {
  place: string;
  dewPointC: number; // now
  humidity: number; // %
  dewMax3d: number; // forecast high for the next 3 days
  dewMin3d: number;
  band: "dry" | "ideal" | "humid";
};

export type Profile = {
  measured: Measured;
  porosity: Porosity;
  climate: Climate | null;
};

export type Tag =
  | "sulfate"
  | "gentle_cleanser"
  | "humectant"
  | "protein"
  | "ceramide"
  | "heavy_butter"
  | "heavy_oil"
  | "light_oil"
  | "insoluble_silicone"
  | "soluble_silicone"
  | "film_former"
  | "drying_alcohol"
  | "fatty_alcohol"
  | "panthenol";

export type TagRule = { tag: Tag; score: number; why: string[] };

export type Rec = {
  /** Positive = seek out, negative = avoid. */
  tags: Record<Tag, TagRule>;
  weight: "light" | "medium" | "rich";
  routine: { step: string; detail: string; why: string }[];
  headline: string;
};

export type Category = "shampoo" | "conditioner" | "leave-in" | "styler" | "treatment";

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  weight: "light" | "medium" | "rich";
  tags: Tag[];
  keyIngredients: string[];
  blurb: string;
  hue: string; // swatch colour for the card
};

export type ScoredProduct = Product & { match: number; pros: string[]; cons: string[] };

export type PreviewPlan = {
  feature: "hair-vol" | "hair-curl";
  realistic: { template: string; label: string };
  promise: { template: string; label: string };
  why: string;
};
