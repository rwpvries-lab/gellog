import { describe, expect, it } from "vitest";
import {
  autocompletePassesSalonFilter,
  looksLikeIceCreamSalon,
  predictionLooksLikeIceCream,
  shouldShowIceCreamMapMarker,
} from "./looksLikeIceCreamSalon";

describe("looksLikeIceCreamSalon", () => {
  it.each([
    "Palazzo Gelato",
    "De Ijssalon",
    "Best Ice Cream Shop",
    "Gelateria Roma",
    "Softijs Express",
    "Maison Glace Paris",
  ])("accepts ice-cream venues: %s", (name) => {
    expect(looksLikeIceCreamSalon(name)).toBe(true);
  });

  it.each([
    "Rijskade Parking",
    "Central Parkeergarage",
    "Hair Studio Amsterdam",
    "Random Bookstore",
  ])("rejects non-ice-cream or blocklisted venues: %s", (name) => {
    expect(looksLikeIceCreamSalon(name)).toBe(false);
  });

  it("does not match whole-word ijs inside unrelated words", () => {
    expect(looksLikeIceCreamSalon("Rijswijk City Hall")).toBe(false);
  });
});

describe("predictionLooksLikeIceCream", () => {
  it("checks main text, secondary text, and description together", () => {
    expect(
      predictionLooksLikeIceCream({
        description: "Palazzo, Utrecht, Netherlands",
        structured_formatting: {
          main_text: "Palazzo",
          secondary_text: "Ice cream shop",
        },
      }),
    ).toBe(true);
  });
});

describe("shouldShowIceCreamMapMarker", () => {
  it("rejects excluded Google place types", () => {
    expect(
      shouldShowIceCreamMapMarker({
        name: "Gelato Palace",
        types: ["restaurant"],
      }),
    ).toBe(false);
  });

  it("accepts ice-cream name terms even without food types", () => {
    expect(
      shouldShowIceCreamMapMarker({
        name: "Palazzo Gelato",
        types: ["point_of_interest"],
      }),
    ).toBe(true);
  });

  it("accepts food-related types when the name is generic", () => {
    expect(
      shouldShowIceCreamMapMarker({
        name: "Palazzo",
        types: ["cafe", "food"],
      }),
    ).toBe(true);
  });
});

describe("autocompletePassesSalonFilter", () => {
  it("prefers map-marker rules when types are present", () => {
    expect(
      autocompletePassesSalonFilter({
        structured_formatting: { main_text: "Palazzo Gelato" },
        types: ["point_of_interest"],
      }),
    ).toBe(true);
  });

  it("falls back to description heuristics for brand-only names", () => {
    expect(
      autocompletePassesSalonFilter({
        description: "Palazzo, Utrecht, Netherlands",
        structured_formatting: { main_text: "Palazzo", secondary_text: "Gelato shop" },
      }),
    ).toBe(true);
  });
});
