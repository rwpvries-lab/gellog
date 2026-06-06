import { describe, expect, it } from "vitest";
import {
  getCrumbleFill,
  hashStringToUint32,
  makeCrumbleDots,
} from "./shared";

describe("hashStringToUint32", () => {
  it("is deterministic for the same seed", () => {
    expect(hashStringToUint32("strawberry")).toBe(hashStringToUint32("strawberry"));
    expect(hashStringToUint32("strawberry")).not.toBe(hashStringToUint32("chocolate"));
  });
});

describe("makeCrumbleDots", () => {
  it("returns a stable dot layout for the same seed", () => {
    const params = { seed: "pistachio", centerX: 50, centerY: 50, radius: 40, count: 5 };
    expect(makeCrumbleDots(params)).toEqual(makeCrumbleDots(params));
  });

  it("respects the requested dot count", () => {
    expect(makeCrumbleDots({ seed: "test", centerX: 0, centerY: 0, radius: 30, count: 3 })).toHaveLength(3);
  });
});

describe("getCrumbleFill", () => {
  it("cycles mixed sprinkles colors by index", () => {
    expect(getCrumbleFill("sprinkles-mixed", 0)).toBe("#D9486A");
    expect(getCrumbleFill("sprinkles-mixed", 1)).toBe("#F2C14E");
  });

  it("returns the token fill for standard crumbles", () => {
    expect(getCrumbleFill("choc-shards", 0)).toBe("#1E1E1E");
  });
});
