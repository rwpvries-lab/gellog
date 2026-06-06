import { describe, expect, it } from "vitest";
import { buildCanonicalFlavourRanking } from "./profile-flavour-ranking";

describe("buildCanonicalFlavourRanking", () => {
  it("groups resolved rows by flavour_id and ranks by log count", () => {
    const { ranking, uncategorisedLogCount, uncategorisedInputNames } =
      buildCanonicalFlavourRanking([
        {
          log_id: "log-1",
          flavour_id: "fl-strawberry",
          flavour_slug: "strawberry",
          canonical_name_nl: "Aardbei",
          canonical_name_en: "Strawberry",
          base_token: "strawberry-pink",
          drizzle_token: "none",
          crumble_token: "fruit-chunks-red",
          rating: 5,
          input_name: "Strawberry",
        },
        {
          log_id: "log-2",
          flavour_id: "fl-strawberry",
          flavour_slug: "strawberry",
          canonical_name_nl: "Aardbei",
          canonical_name_en: "Strawberry",
          base_token: "strawberry-pink",
          drizzle_token: "none",
          crumble_token: "fruit-chunks-red",
          rating: 4,
          input_name: "Strawberry",
        },
        {
          log_id: "log-3",
          flavour_id: "fl-chocolate",
          flavour_slug: "chocolate",
          canonical_name_nl: "Chocolade",
          canonical_name_en: "Chocolate",
          base_token: "chocolate-brown",
          drizzle_token: "none",
          crumble_token: "none",
          rating: 5,
          input_name: "Chocolate",
        },
      ]);

    expect(ranking).toHaveLength(2);
    expect(ranking[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        flavourId: "fl-strawberry",
        displayName: "Strawberry",
        logCount: 2,
        avgRating: 4.5,
      }),
    );
    expect(uncategorisedLogCount).toBe(0);
    expect(uncategorisedInputNames).toEqual([]);
  });

  it("tracks uncategorised resolved rows alongside categorised ones", () => {
    const result = buildCanonicalFlavourRanking([
      {
        log_id: "log-1",
        flavour_id: "fl-strawberry",
        flavour_slug: "strawberry",
        canonical_name_nl: "Aardbei",
        canonical_name_en: "Strawberry",
        base_token: "strawberry-pink",
        drizzle_token: "none",
        crumble_token: "none",
        rating: 5,
        input_name: "Strawberry",
      },
      {
        log_id: "log-2",
        flavour_id: null,
        flavour_slug: null,
        canonical_name_nl: null,
        canonical_name_en: null,
        base_token: "cream",
        drizzle_token: "none",
        crumble_token: "none",
        rating: 3,
        input_name: "Mystery Swirl",
      },
    ]);

    expect(result.ranking).toHaveLength(1);
    expect(result.uncategorisedLogCount).toBe(1);
    expect(result.uncategorisedInputNames).toEqual(["Mystery Swirl"]);
  });

  it("prefers the most frequently logged name over canonical names", () => {
    const { ranking } = buildCanonicalFlavourRanking([
      {
        log_id: "log-1",
        flavour_id: "fl-1",
        flavour_slug: "strawberry",
        canonical_name_nl: "Aardbei",
        canonical_name_en: "Strawberry",
        base_token: "strawberry-pink",
        drizzle_token: "none",
        crumble_token: "none",
        rating: 5,
        input_name: "Aardbei",
      },
      {
        log_id: "log-2",
        flavour_id: "fl-1",
        flavour_slug: "strawberry",
        canonical_name_nl: "Aardbei",
        canonical_name_en: "Strawberry",
        base_token: "strawberry-pink",
        drizzle_token: "none",
        crumble_token: "none",
        rating: 4,
        input_name: "Strawberry",
      },
      {
        log_id: "log-3",
        flavour_id: "fl-1",
        flavour_slug: "strawberry",
        canonical_name_nl: "Aardbei",
        canonical_name_en: "Strawberry",
        base_token: "strawberry-pink",
        drizzle_token: "none",
        crumble_token: "none",
        rating: 4,
        input_name: "Strawberry",
      },
    ]);

    expect(ranking[0]?.displayName).toBe("Strawberry");
  });

  it("rolls up legacy rows by free-text name when no flavour_id exists", () => {
    const { ranking, uncategorisedLogCount } = buildCanonicalFlavourRanking([
      {
        log_id: "log-1",
        flavour_id: null,
        flavour_slug: null,
        canonical_name_nl: null,
        canonical_name_en: null,
        base_token: "pistachio-green",
        drizzle_token: "none",
        crumble_token: "none",
        rating: 5,
        input_name: "Pistachio",
      },
      {
        log_id: "log-2",
        flavour_id: null,
        flavour_slug: null,
        canonical_name_nl: null,
        canonical_name_en: null,
        base_token: "pistachio-green",
        drizzle_token: "none",
        crumble_token: "none",
        rating: 4,
        input_name: "pistachio",
      },
    ]);

    expect(ranking).toHaveLength(1);
    expect(ranking[0]?.logCount).toBe(2);
    expect(ranking[0]?.flavourId).toBe("legacy:pistachio");
    expect(uncategorisedLogCount).toBe(0);
  });
});
