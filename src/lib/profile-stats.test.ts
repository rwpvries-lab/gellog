import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRankedFlavours,
  deriveStats,
  resolveSalonPlaceId,
  type StatsLog,
} from "./profile-stats";

function makeLog(overrides: Partial<StatsLog> = {}): StatsLog {
  return {
    id: "log-1",
    salon_name: "Gelato Palace",
    salon_place_id: "place-a",
    salon_city: "Utrecht",
    overall_rating: 4,
    visited_at: "2026-06-01T12:00:00.000Z",
    price_cents: 450,
    weather_condition: "☀️ Clear sky",
    log_flavours: [{ flavour_name: "Strawberry", rating: 5, rating_texture: null, rating_originality: null, rating_intensity: null, rating_presentation: null }],
    ...overrides,
  };
}

describe("resolveSalonPlaceId", () => {
  it("picks the place id with the most visits, then the most recent visit", () => {
    const logs: StatsLog[] = [
      makeLog({ id: "1", salon_place_id: "place-a", visited_at: "2026-05-01T12:00:00.000Z" }),
      makeLog({ id: "2", salon_place_id: "place-b", visited_at: "2026-06-01T12:00:00.000Z" }),
      makeLog({ id: "3", salon_place_id: "place-a", visited_at: "2026-06-02T12:00:00.000Z" }),
    ];

    expect(resolveSalonPlaceId(logs, "Gelato Palace")).toBe("place-a");
  });

  it("returns null when no matching place ids exist", () => {
    expect(resolveSalonPlaceId([makeLog({ salon_place_id: null })], "Gelato Palace")).toBeNull();
  });
});

describe("deriveStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aggregates totals, flavour rollups, and salon rollups", () => {
    const stats = deriveStats([
      makeLog({
        id: "1",
        visited_at: "2026-06-05T12:00:00.000Z",
        overall_rating: 4,
        log_flavours: [
          { flavour_name: "Strawberry", rating: 5, rating_texture: null, rating_originality: null, rating_intensity: null, rating_presentation: null },
          { flavour_name: "Chocolate", rating: 3, rating_texture: null, rating_originality: null, rating_intensity: null, rating_presentation: null },
        ],
      }),
      makeLog({
        id: "2",
        salon_name: "Other Salon",
        salon_place_id: "place-b",
        visited_at: "2025-01-15T12:00:00.000Z",
        overall_rating: 5,
        price_cents: 500,
        weather_condition: "☀️ Clear sky",
        log_flavours: [
          { flavour_name: "Strawberry", rating: 4, rating_texture: null, rating_originality: null, rating_intensity: null, rating_presentation: null },
        ],
      }),
      makeLog({
        id: "3",
        visited_at: "2026-06-04T12:00:00.000Z",
        overall_rating: 3,
        price_cents: 400,
        log_flavours: [
          { flavour_name: "Strawberry", rating: 3, rating_texture: null, rating_originality: null, rating_intensity: null, rating_presentation: null },
        ],
      }),
    ]);

    expect(stats.totalAllTime).toBe(3);
    expect(stats.totalThisYear).toBe(2);
    expect(stats.averageOverallRating).toBe(4);
    expect(stats.uniqueFlavourCount).toBe(2);
    expect(stats.uniqueSalonCount).toBe(2);
    expect(stats.mostVisitedSalon?.name).toBe("Gelato Palace");
    expect(stats.bestWeather).toBe("☀️ Clear sky");
    expect(stats.totalSpent).toBeCloseTo(13.5);
    expect(stats.averagePerVisit).toBeCloseTo(4.5);
    expect(stats.flavoursRollup[0]).toEqual({ name: "Strawberry", timesTried: 3 });
    expect(stats.salonsRollup[0]?.name).toBe("Gelato Palace");
  });

  it("hides spending stats until at least three priced logs exist", () => {
    const stats = deriveStats([
      makeLog({ price_cents: 400 }),
      makeLog({ id: "2", price_cents: 500 }),
    ]);

    expect(stats.totalSpent).toBeNull();
    expect(stats.averagePerVisit).toBeNull();
  });
});

describe("buildRankedFlavours", () => {
  it("delegates to canonical ranking and attaches gelato tokens", () => {
    const { rankedFlavours, uncategorisedLogCount } = buildRankedFlavours([
      {
        log_id: "log-1",
        flavour_name: "Strawberry",
        rating_stars: 5,
        base_token: "strawberry-pink",
        drizzle_token: "none",
        crumble_token: "fruit-chunks-red",
        canonical_name_en: "Strawberry",
      },
    ]);

    expect(rankedFlavours).toHaveLength(1);
    expect(rankedFlavours[0]?.tokens.base).toBe("strawberry-pink");
    expect(uncategorisedLogCount).toBe(0);
  });
});
