import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

import { getFlavourDisplayLabel } from "./FeedCard";
import type { LogFlavour } from "@/src/lib/log-flavours-resolved";

describe("getFlavourDisplayLabel", () => {
  const base: LogFlavour = {
    id: "1",
    flavour_name: "Typed Name",
    rating: 5,
    tags: null,
    rating_texture: null,
    rating_originality: null,
    rating_intensity: null,
    rating_presentation: null,
  };

  it("prefers canonical English name", () => {
    expect(
      getFlavourDisplayLabel({
        ...base,
        canonical_name_en: "Strawberry",
        input_name: "Aardbei",
        flavour_name: "Typed Name",
      }),
    ).toBe("Strawberry");
  });

  it("falls back to input name, then Dutch, then flavour_name", () => {
    expect(getFlavourDisplayLabel({ ...base, input_name: "  Mango  " })).toBe("Mango");
    expect(getFlavourDisplayLabel({ ...base, canonical_name_nl: "Aardbei" })).toBe("Aardbei");
    expect(getFlavourDisplayLabel(base)).toBe("Typed Name");
    expect(getFlavourDisplayLabel({ ...base, flavour_name: "  " })).toBe("Flavour");
  });
});
