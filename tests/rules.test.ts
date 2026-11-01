import { describe, expect, it } from "vitest";
import { dayAdvice, dewBand, familyOf, lengthBand, previewPlan, recommend } from "../src/lib/rules";
import { scoreProduct, shopQuery, shortlist } from "../src/lib/catalog";
import type { Climate, Measured, Profile } from "../src/lib/types";

const measured = (o: Partial<Measured> = {}): Measured => ({
  type: { mapping: "3A to 3B", term: "Loose to Medium Curls", index: 4, family: "curly" },
  frizz: { level: 2, term: "Frizzy" },
  density: { value: 2.8, term: "High Density" },
  length: { term: "above chest", band: "medium" },
  issues: [],
  framing: {},
  ...o,
});
const climate = (dp: number): Climate => ({ place: "Test", dewPointC: dp, humidity: 70, dewMax3d: dp, dewMin3d: dp, band: dewBand(dp) });
const profile = (o: Partial<Profile> = {}): Profile => ({ measured: measured(), porosity: "normal", climate: climate(10), ...o });

describe("classification helpers", () => {
  it("maps YouCam's nine type ranges to curl families", () => {
    expect([0, 1, 3, 4, 5, 6, 8].map(familyOf)).toEqual(["straight", "wavy", "wavy", "curly", "curly", "coily", "coily"]);
  });
  it("bands dew point into dry / ideal / humid", () => {
    expect([-3, 4, 10, 15, 16, 22].map(dewBand)).toEqual(["dry", "ideal", "ideal", "ideal", "humid", "humid"]);
  });
  it("bands YouCam length terms", () => {
    expect(lengthBand("above the ears")).toBe("short");
    expect(lengthBand("above chest")).toBe("medium");
    expect(lengthBand("long hair")).toBe("long");
  });
});

describe("rule engine", () => {
  it("tells you to avoid glycerin when the air is humid, and explains why with the dew point", () => {
    const r = recommend(profile({ climate: climate(22) }));
    expect(r.tags.humectant.score).toBeLessThan(0);
    expect(r.tags.humectant.why.join(" ")).toMatch(/22°C dew point/);
    expect(r.tags.film_former.score).toBeGreaterThan(0);
  });
  it("also avoids glycerin in very dry air, but recommends it in the sweet spot", () => {
    expect(recommend(profile({ climate: climate(-3) })).tags.humectant.score).toBeLessThan(0);
    expect(recommend(profile({ climate: climate(10), porosity: "low" })).tags.humectant.score).toBeGreaterThan(0);
  });
  it("keeps fine, low-density straight hair away from butters and recommends a light routine", () => {
    const r = recommend(
      profile({ measured: measured({ type: { mapping: "1 to 2A", term: "Straight", index: 0, family: "straight" }, density: { value: 1.1, term: "Low Density" }, frizz: { level: 0, term: "Not Frizzy" } }) }),
    );
    expect(r.weight).toBe("light");
    expect(r.tags.heavy_butter.score).toBeLessThan(0);
  });
  it("gives coily, dense hair a rich routine with butters and no sulfates", () => {
    const r = recommend(profile({ measured: measured({ type: { mapping: "4B to 4C", term: "Coily", index: 8, family: "coily" } }), porosity: "high" }));
    expect(r.weight).toBe("rich");
    expect(r.tags.heavy_butter.score).toBeGreaterThan(0);
    expect(r.tags.sulfate.score).toBeLessThan(0);
    expect(r.tags.protein.score).toBeGreaterThan(0);
  });
  it("every non-zero score carries at least one human-readable reason", () => {
    const r = recommend(profile({ climate: climate(22), porosity: "high" }));
    for (const t of Object.values(r.tags)) if (t.score !== 0) expect(t.why.length).toBeGreaterThan(0);
  });
  it("adds a protect step for frizzy hair", () => {
    expect(recommend(profile()).routine.some((s) => s.step === "Protect")).toBe(true);
  });
});

describe("product scoring", () => {
  it("ranks glycerin-free stylers above glycerin gels on a humid day for frizzy curls", () => {
    const rec = recommend(profile({ climate: climate(22) }));
    const humid = scoreProduct({ tags: ["film_former", "soluble_silicone"], weight: "light" }, rec);
    const glycerin = scoreProduct({ tags: ["film_former", "humectant"], weight: "light" }, rec);
    expect(humid.match).toBeGreaterThan(glycerin.match);
    expect(glycerin.cons.join(" ")).toMatch(/Humectants/);
  });
  it("keeps match within 3–99 and lists a best product per category", () => {
    const s = shortlist(recommend(profile()));
    for (const items of Object.values(s)) {
      expect(items.length).toBeGreaterThan(0);
      for (const p of items) expect(p.match).toBeGreaterThanOrEqual(3), expect(p.match).toBeLessThanOrEqual(99);
      expect(items[0].match).toBeGreaterThanOrEqual(items[items.length - 1].match);
    }
  });
  it("builds a real-product search query from the rules", () => {
    const q = shopQuery("styler", recommend(profile({ climate: climate(22) })), "curly");
    expect(q).toMatch(/glycerin-free/);
    expect(q).toMatch(/curly hair styling gel/);
  });
});

describe("try-on plan and daily advice", () => {
  it("previews volume for curls and waves for wavy hair", () => {
    expect(previewPlan(measured(), "feminine").feature).toBe("hair-vol");
    expect(previewPlan(measured({ type: { mapping: "2A to 2B", term: "Wavy", index: 1, family: "wavy" } }), "feminine").feature).toBe("hair-curl");
  });
  it("switches routine advice by the day's dew point", () => {
    expect(dayAdvice("humid", 2).title).toMatch(/Anti-humidity/);
    expect(dayAdvice("dry", 1).title).toMatch(/Dry-air/);
    expect(dayAdvice("ideal", 1).title).toMatch(/Humectant-friendly/);
  });
});
