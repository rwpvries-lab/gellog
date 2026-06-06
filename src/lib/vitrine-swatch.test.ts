import { describe, expect, it } from "vitest";
import { BASE_TOKENS, DRIZZLE_TOKENS } from "./gelato-tokens";
import { resolveVitrineSwatch } from "./vitrine-swatch";

describe("resolveVitrineSwatch", () => {
  it("returns the base hex for non-near-white bases", () => {
    expect(
      resolveVitrineSwatch({
        base_token: "strawberry-pink",
        drizzle_token: "none",
        crumble_token: "none",
      }),
    ).toBe(BASE_TOKENS["strawberry-pink"].hex);
  });

  it("falls back to drizzle stroke when the base is near-white", () => {
    expect(
      resolveVitrineSwatch({
        base_token: "coconut-white",
        drizzle_token: "mango-swirl",
        crumble_token: "none",
      }),
    ).toBe(DRIZZLE_TOKENS["mango-swirl"].stroke);
  });

  it("falls back to crumble fill when base and drizzle are near-white or absent", () => {
    expect(
      resolveVitrineSwatch({
        base_token: "coconut-white",
        drizzle_token: "none",
        crumble_token: "fruit-chunks-red",
      }),
    ).toBe("#D9486A");
  });

  it("keeps the near-white base when no colourful fallback exists", () => {
    expect(
      resolveVitrineSwatch({
        base_token: "coconut-white",
        drizzle_token: "none",
        crumble_token: "none",
      }),
    ).toBe(BASE_TOKENS["coconut-white"].hex);
  });

  it("returns null when no base token is provided", () => {
    expect(resolveVitrineSwatch({ base_token: null })).toBeNull();
  });
});
