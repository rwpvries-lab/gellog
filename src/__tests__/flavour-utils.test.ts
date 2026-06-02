import { describe, it, expect } from "vitest";
import { mapFlavourToSlug, getFlavourScoopUrl } from "@/src/lib/flavour-scoop";
import { gelatoTokensFromNullableTokens } from "@/src/lib/gelato-tokens";

describe("mapFlavourToSlug", () => {
  it("lowercases and hyphenates a simple name", () => {
    expect(mapFlavourToSlug("Strawberry")).toBe("strawberry");
  });

  it("converts spaces to hyphens", () => {
    expect(mapFlavourToSlug("Cookie Dough")).toBe("cookie-dough");
  });

  it("strips diacritics", () => {
    expect(mapFlavourToSlug("Crème Brûlée")).toBe("creme-brulee");
  });

  it("expands & to 'and'", () => {
    expect(mapFlavourToSlug("Cookies & Cream")).toBe("cookies-and-cream");
  });

  it("strips leading/trailing hyphens", () => {
    expect(mapFlavourToSlug("  Pistachio  ")).toBe("pistachio");
  });

  it("collapses multiple spaces", () => {
    expect(mapFlavourToSlug("Mango  Yogurt")).toBe("mango-yogurt");
  });

  it("returns default slug for empty string", () => {
    expect(mapFlavourToSlug("")).toBe("strawberry");
  });

  it("returns default slug for undefined", () => {
    expect(mapFlavourToSlug(undefined)).toBe("strawberry");
  });

  it("strips special characters", () => {
    expect(mapFlavourToSlug("Caramel!@#Fudge")).toBe("caramelfudge");
  });
});

describe("getFlavourScoopUrl", () => {
  it("builds a URL from slug", () => {
    expect(getFlavourScoopUrl("pistachio")).toBe("/assets/scoops/pistachio.svg");
  });

  it("falls back to strawberry for empty string", () => {
    expect(getFlavourScoopUrl("")).toBe("/assets/scoops/strawberry.svg");
  });

  it("trims whitespace from slug", () => {
    expect(getFlavourScoopUrl("  chocolate  ")).toBe("/assets/scoops/chocolate.svg");
  });
});

describe("gelatoTokensFromNullableTokens", () => {
  it("returns cream/none/none when base_token is null", () => {
    expect(gelatoTokensFromNullableTokens(null, null, null)).toEqual({
      base: "cream",
      drizzle: "none",
      crumble: "none",
    });
  });

  it("returns cream/none/none when base_token is undefined", () => {
    expect(gelatoTokensFromNullableTokens(undefined, undefined, undefined)).toEqual({
      base: "cream",
      drizzle: "none",
      crumble: "none",
    });
  });

  it("maps provided tokens through", () => {
    expect(gelatoTokensFromNullableTokens("strawberry-pink", "strawberry-swirl", "fruit-chunks-red")).toEqual({
      base: "strawberry-pink",
      drizzle: "strawberry-swirl",
      crumble: "fruit-chunks-red",
    });
  });

  it("defaults drizzle and crumble to 'none' when null", () => {
    expect(gelatoTokensFromNullableTokens("chocolate-brown", null, null)).toEqual({
      base: "chocolate-brown",
      drizzle: "none",
      crumble: "none",
    });
  });

  it("defaults only crumble to 'none' when null", () => {
    expect(gelatoTokensFromNullableTokens("pistachio-green", "chocolate-swirl", null)).toEqual({
      base: "pistachio-green",
      drizzle: "chocolate-swirl",
      crumble: "none",
    });
  });
});
