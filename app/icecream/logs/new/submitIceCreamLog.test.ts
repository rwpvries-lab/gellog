import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import type { LogFlowState } from "./logFlowReducer";
import { submitIceCreamLog, visitedAtToIsoUtc } from "./submitIceCreamLog";

vi.mock("@/src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/src/lib/imageUtils", () => ({
  resizeImageBeforeUpload: vi.fn(),
}));

function makeSubmitState(overrides: Partial<LogFlowState> = {}): LogFlowState {
  return {
    currentStep: 3,
    step1: {
      salon: {
        salon_name: "Gelato Palace",
        salon_place_id: "place-1",
        salon_address: "1 Main St",
        salon_lat: 52.1,
        salon_lng: 5.1,
        salon_city: "Utrecht",
      },
      salonInput: "Gelato Palace",
      date: "2026-06-06",
      hour: 14,
      minute: 0,
    },
    step2: {
      flavours: [{ id: 1, name: "Strawberry", rating: 5, tags: ["fruity"] }],
    },
    step3: {
      vessel: "cone",
      photoFile: null,
      notes: "Great!",
      visibility: "public",
      photoVisibility: "public",
      weather: {
        temperature: 20,
        apparentTemperature: 21,
        code: 1,
        label: "Clear",
        emoji: "☀️",
        uvIndex: 5,
      },
      priceInput: "4,50",
      hidePrice: false,
      overallRating: 5,
      priceWarning: null,
    },
    ...overrides,
  };
}

function buildSubmitMockSupabase(options?: {
  logInsertError?: unknown;
  flavoursInsertError?: unknown;
  noUser?: boolean;
  uploadError?: unknown;
}) {
  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const logDelete = vi.fn().mockReturnValue({ eq: deleteEq });
  const flavoursInsert = vi
    .fn()
    .mockResolvedValue({ error: options?.flavoursInsertError ?? null });
  const logInsertSingle = vi.fn().mockResolvedValue({
    data: options?.logInsertError ? null : { id: "log-123" },
    error: options?.logInsertError ?? null,
  });
  const logInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ single: logInsertSingle }),
  });

  const from = vi.fn((table: string) => {
    if (table === "ice_cream_logs") {
      return { insert: logInsert, delete: logDelete };
    }
    if (table === "log_flavours") {
      return { insert: flavoursInsert };
    }
    if (table === "salon_profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "salon-profile-1" } }),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [] }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.noUser ? null : { id: "user-1" } },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: options?.uploadError ? null : { path: "user-1/photo.webp" },
          error: options?.uploadError ?? null,
        }),
      }),
    },
    from,
    spies: { logInsert, flavoursInsert, logDelete, deleteEq },
  };
}

describe("visitedAtToIsoUtc", () => {
  it("combines local date and clock fields into an ISO timestamp", () => {
    const iso = visitedAtToIsoUtc(makeSubmitState());
    const parsed = new Date(iso);

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(5);
    expect(parsed.getDate()).toBe(6);
    expect(parsed.getHours()).toBe(14);
    expect(parsed.getMinutes()).toBe(0);
  });
});

describe("submitIceCreamLog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 6, 14, 0, 0));
    vi.mocked(resizeImageBeforeUpload).mockResolvedValue(new Blob(["webp"], { type: "image/webp" }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tempC: 18, condition: "Clear sky" }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("rejects missing salon name", async () => {
    const result = await submitIceCreamLog({
      userId: "user-1",
      state: makeSubmitState({ step1: { ...makeSubmitState().step1, salonInput: "   " } }),
    });
    expect(result).toEqual({ ok: false, error: expect.any(Error) });
  });

  it("rejects logs without named flavours", async () => {
    const result = await submitIceCreamLog({
      userId: "user-1",
      state: makeSubmitState({ step2: { flavours: [{ id: 1, name: "  ", rating: 5, tags: [] }] } }),
    });
    expect(result).toEqual({ ok: false, error: expect.any(Error) });
  });

  it("rejects logs without star ratings", async () => {
    const result = await submitIceCreamLog({
      userId: "user-1",
      state: makeSubmitState({
        step2: { flavours: [{ id: 1, name: "Strawberry", rating: null, tags: [] }] },
      }),
    });
    expect(result).toEqual({ ok: false, error: expect.any(Error) });
  });

  it("inserts a log and flavour rows on the happy path", async () => {
    const mock = buildSubmitMockSupabase();
    vi.mocked(createClient).mockReturnValue(mock as never);

    const result = await submitIceCreamLog({ userId: "user-1", state: makeSubmitState() });

    expect(result).toEqual({ ok: true, logId: "log-123" });
    expect(mock.spies.logInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        salon_name: "Gelato Palace",
        overall_rating: 5,
        price_cents: 450,
        weather_temp_c: 20,
        weather_condition: "☀️ Clear",
        notes: "Great!",
      }),
    );
    expect(mock.spies.flavoursInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        log_id: "log-123",
        flavour_name: "Strawberry",
        rating_stars: 5,
        tags: ["fruity"],
      }),
    ]);
  });

  it("deletes the parent log when flavour insert fails", async () => {
    const mock = buildSubmitMockSupabase({ flavoursInsertError: new Error("flavours failed") });
    vi.mocked(createClient).mockReturnValue(mock as never);

    const result = await submitIceCreamLog({ userId: "user-1", state: makeSubmitState() });

    expect(result.ok).toBe(false);
    expect(mock.spies.logDelete).toHaveBeenCalled();
    expect(mock.spies.deleteEq).toHaveBeenCalledWith("id", "log-123");
  });

  it("requires auth when uploading a photo", async () => {
    const mock = buildSubmitMockSupabase({ noUser: true });
    vi.mocked(createClient).mockReturnValue(mock as never);
    const file = new File(["photo"], "scoop.jpg", { type: "image/jpeg" });

    const result = await submitIceCreamLog({
      userId: "user-1",
      state: makeSubmitState({ step3: { ...makeSubmitState().step3, photoFile: file } }),
    });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ message: "You must be logged in to upload a photo." }),
    });
  });

  it("fetches historical weather for retroactive visits", async () => {
    const mock = buildSubmitMockSupabase();
    vi.mocked(createClient).mockReturnValue(mock as never);

    const result = await submitIceCreamLog({
      userId: "user-1",
      state: makeSubmitState({
        step1: {
          ...makeSubmitState().step1,
          date: "2026-06-01",
          hour: 12,
          minute: 0,
        },
        step3: { ...makeSubmitState().step3, weather: null },
      }),
    });

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/weather/historical",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mock.spies.logInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        weather_temp_c: 18,
        weather_condition: "Clear sky",
      }),
    );
  });
});
