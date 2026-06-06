import { describe, expect, it } from "vitest";
import { getFlavourColor } from "./VesselIllustration";

describe("getFlavourColor", () => {
  it("matches known flavour keywords", () => {
    expect(getFlavourColor("Pistachio", 0)).toBe("#A8C5A0");
    expect(getFlavourColor("Dark Chocolate", 0)).toBe("#7B5E3A");
    expect(getFlavourColor("Aardbei", 0)).toBe("#F4A7B9");
  });

  it("falls back to the palette by index when no keyword matches", () => {
    expect(getFlavourColor("Mystery Flavour", 0)).toBe("#F4A7B9");
    expect(getFlavourColor("Mystery Flavour", 2)).toBe("#F5E6C8");
  });
});
