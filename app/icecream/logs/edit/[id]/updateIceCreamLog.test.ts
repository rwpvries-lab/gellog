import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/src/lib/supabase/client";
import { updateIceCreamLog, type UpdateIceCreamLogInput } from "./updateIceCreamLog";

vi.mock("@/src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

function makeInput(overrides: Partial<UpdateIceCreamLogInput> = {}): UpdateIceCreamLogInput {
  return {
    userId: "user-1",
    logId: "log-99",
    salonName: "Gelato Palace",
    salonPlaceId: "place-1",
    salonAddress: "1 Main St",
    salonLat: 52.1,
    salonLng: 5.1,
    salonCity: "Utrecht",
    overallRating: 4,
    notes: "Still great",
    visitedAtIso: new Date(2026, 5, 6, 14, 0, 0).toISOString(),
    vessel: "cone",
    pricePaid: "4,50",
    hidePriceFromOthers: false,
    photoUrl: null,
    photoVisibility: "public",
    savedWeatherTempC: 22,
    savedWeatherCondition: "☀️ Clear sky",
    capturedWeather: null,
    visibility: "public",
    flavours: [
      {
        name: "Stracciatella",
        rating: 5,
        tags: ["Dairy-free"],
        ratingTexture: 4,
        ratingOriginality: null,
        ratingIntensity: null,
        ratingPresentation: null,
      },
      {
        name: "Pistachio",
        rating: 4,
        tags: [],
        ratingTexture: null,
        ratingOriginality: null,
        ratingIntensity: null,
        ratingPresentation: null,
      },
    ],
    ...overrides,
  };
}

function buildUpdateMockSupabase(options?: {
  logUpdateError?: unknown;
  deleteError?: unknown;
  flavoursInsertError?: unknown;
}) {
  const logUpdateEqUser = vi.fn().mockResolvedValue({ error: options?.logUpdateError ?? null });
  const logUpdateEqId = vi.fn().mockReturnValue({ eq: logUpdateEqUser });
  const logUpdate = vi.fn().mockReturnValue({ eq: logUpdateEqId });

  const deleteEq = vi.fn().mockResolvedValue({ error: options?.deleteError ?? null });
  const flavoursDelete = vi.fn().mockReturnValue({ eq: deleteEq });

  const flavoursInsert = vi
    .fn()
    .mockResolvedValue({ error: options?.flavoursInsertError ?? null });

  const from = vi.fn((table: string) => {
    if (table === "ice_cream_logs") {
      return { update: logUpdate };
    }
    if (table === "log_flavours") {
      return { delete: flavoursDelete, insert: flavoursInsert };
    }
    return {};
  });

  return {
    from,
    spies: { logUpdate, logUpdateEqId, logUpdateEqUser, flavoursDelete, deleteEq, flavoursInsert },
  };
}

describe("updateIceCreamLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects empty salon name", async () => {
    const result = await updateIceCreamLog(makeInput({ salonName: "   " }));
    expect(result).toEqual({ ok: false, error: expect.any(Error) });
  });

  it("rejects logs without named flavours", async () => {
    const result = await updateIceCreamLog(
      makeInput({
        flavours: [{ name: "  ", rating: 5, tags: [], ratingTexture: null, ratingOriginality: null, ratingIntensity: null, ratingPresentation: null }],
      }),
    );
    expect(result).toEqual({ ok: false, error: expect.any(Error) });
  });

  it("updates the log, deletes old flavours, and inserts the new set", async () => {
    const mock = buildUpdateMockSupabase();
    vi.mocked(createClient).mockReturnValue(mock as never);

    const result = await updateIceCreamLog(makeInput());

    expect(result).toEqual({ ok: true });
    expect(mock.spies.logUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        salon_name: "Gelato Palace",
        overall_rating: 4,
        price_cents: 450,
        weather_temp_c: 22,
        weather_condition: "☀️ Clear sky",
        notes: "Still great",
      }),
    );
    expect(mock.spies.logUpdateEqId).toHaveBeenCalledWith("id", "log-99");
    expect(mock.spies.logUpdateEqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(mock.spies.flavoursDelete).toHaveBeenCalled();
    expect(mock.spies.deleteEq).toHaveBeenCalledWith("log_id", "log-99");
    expect(mock.spies.flavoursInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        log_id: "log-99",
        flavour_name: "Stracciatella",
        rating_stars: 5,
        tags: ["Dairy-free"],
        texture: 4,
      }),
      expect.objectContaining({
        log_id: "log-99",
        flavour_name: "Pistachio",
        rating_stars: 4,
        tags: null,
      }),
    ]);
  });

  it("prefers freshly captured weather over saved values", async () => {
    const mock = buildUpdateMockSupabase();
    vi.mocked(createClient).mockReturnValue(mock as never);

    const result = await updateIceCreamLog(
      makeInput({
        capturedWeather: { temperature: 28, label: "Hot", emoji: "🔥" },
      }),
    );

    expect(result.ok).toBe(true);
    expect(mock.spies.logUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        weather_temp_c: 28,
        weather_condition: "🔥 Hot",
      }),
    );
  });

  it("returns an error when flavour re-insert fails after delete", async () => {
    const mock = buildUpdateMockSupabase({ flavoursInsertError: new Error("insert failed") });
    vi.mocked(createClient).mockReturnValue(mock as never);

    const result = await updateIceCreamLog(makeInput());

    expect(result).toEqual({ ok: false, error: expect.any(Error) });
    expect(mock.spies.flavoursDelete).toHaveBeenCalled();
    expect(mock.spies.flavoursInsert).toHaveBeenCalled();
  });
});
