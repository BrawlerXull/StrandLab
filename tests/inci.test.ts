import { describe, expect, it } from "vitest";
import { classifyInci, splitInci } from "../src/lib/inci";

const tags = (t: string, n = "") => classifyInci(t, n).tags.map((x) => x.tag).sort();

describe("INCI classifier", () => {
  it("splits on commas outside brackets", () => {
    expect(splitInci("Ingredients: Aqua (Water, Eau), Glycerin, Parfum.")).toEqual(["Aqua (Water, Eau)", "Glycerin", "Parfum"]);
  });
  it("does not treat fatty alcohols as drying alcohols", () => {
    const t = tags("Aqua, Cetearyl Alcohol, Alcohol Denat., Behentrimonium Chloride");
    expect(t).toContain("fatty_alcohol");
    expect(t).toContain("drying_alcohol");
    expect(classifyInci("Aqua, Cetearyl Alcohol").tags.map((x) => x.tag)).not.toContain("drying_alcohol");
  });
  it("separates water-soluble from insoluble silicones", () => {
    expect(tags("Aqua, PEG-12 Dimethicone")).toEqual(["soluble_silicone"]);
    expect(tags("Aqua, Dimethicone, Amodimethicone")).toEqual(["insoluble_silicone"]);
  });
  it("only counts humectants in the first 8 ingredients", () => {
    expect(tags("Aqua, Glycerin")).toContain("humectant");
    expect(tags("Aqua, A, B, C, D, E, F, G, H, Glycerin")).not.toContain("humectant");
  });
  it("classifies a curl gel, a butter cream and a sulfate shampoo", () => {
    const gel = classifyInci("Aqua, Glycerin, Polyquaternium-11, Aloe Barbadensis Leaf Juice, Panthenol, Linum Usitatissimum Seed Extract", "Curl Gel");
    expect(gel.tags.map((t) => t.tag).sort()).toEqual(["film_former", "humectant", "panthenol"]);
    expect(gel.weight).toBe("light");
    expect(gel.product_guess).toBe("styler");
    const cream = classifyInci("Aqua, Butyrospermum Parkii Butter, Cetearyl Alcohol, Cocos Nucifera Oil", "Curl Cream");
    expect(cream.weight).toBe("rich");
    expect(tags("Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Dimethicone")).toEqual(["gentle_cleanser", "insoluble_silicone", "sulfate"]);
  });
});
