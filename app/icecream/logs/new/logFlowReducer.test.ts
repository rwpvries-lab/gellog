import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SalonRef } from "@/src/components/SalonInput";
import {
  canAdvanceFromStep1,
  canAdvanceFromStep2,
  createInitialLogFlowState,
  defaultHour,
  defaultMinute,
  flowFingerprint,
  logFlowReducer,
  todayDateStr,
  type LogFlowAction,
  type LogFlowState,
} from "./logFlowReducer";

const salon: SalonRef = {
  salon_name: "Gelato Palace",
  salon_place_id: "place-123",
  salon_address: "1 Main St",
  salon_lat: 52.1,
  salon_lng: 5.1,
  salon_city: "Utrecht",
};

function baseState(overrides: Partial<LogFlowState> = {}): LogFlowState {
  return {
    ...createInitialLogFlowState({ defaultVisibility: "public" }),
    ...overrides,
  };
}

describe("todayDateStr / defaultHour / defaultMinute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 6, 14, 22, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("derives today and rounded clock defaults from the current moment", () => {
    expect(todayDateStr()).toBe("2026-06-06");
    expect(defaultHour()).toBe(14);
    expect(defaultMinute()).toBe(15);
  });
});

describe("createInitialLogFlowState", () => {
  it("creates an empty flavour list by default", () => {
    const state = createInitialLogFlowState({ defaultVisibility: "followers" });

    expect(state.currentStep).toBe(1);
    expect(state.step1.salon).toBeNull();
    expect(state.step1.salonInput).toBe("");
    expect(state.step2.flavours).toEqual([]);
    expect(state.step3.visibility).toBe("followers");
    expect(state.step3.overallRating).toBe(5);
  });

  it("prefills salon and flavour when provided", () => {
    const state = createInitialLogFlowState({
      defaultVisibility: "public",
      initialSalon: salon,
      initialPrefillFlavour: " Pistachio ",
    });

    expect(state.step1.salon).toEqual(salon);
    expect(state.step1.salonInput).toBe("Gelato Palace");
    expect(state.step2.flavours).toEqual([
      expect.objectContaining({
        id: 1,
        name: "Pistachio",
        rating: null,
      }),
    ]);
  });
});

describe("logFlowReducer", () => {
  it("SET_SALON updates salon and clears salonInput when null", () => {
    const withSalon = logFlowReducer(baseState(), { type: "SET_SALON", salon });
    expect(withSalon.step1.salon).toEqual(salon);
    expect(withSalon.step1.salonInput).toBe("Gelato Palace");

    const cleared = logFlowReducer(withSalon, { type: "SET_SALON", salon: null });
    expect(cleared.step1.salon).toBeNull();
    expect(cleared.step1.salonInput).toBe("");
  });

  it("SET_DATE and SET_TIME update step 1 fields", () => {
    let state = logFlowReducer(baseState(), { type: "SET_DATE", date: "2026-06-01" });
    state = logFlowReducer(state, { type: "SET_TIME", hour: 14, minute: 30 });

    expect(state.step1.date).toBe("2026-06-01");
    expect(state.step1.hour).toBe(14);
    expect(state.step1.minute).toBe(30);
  });

  it("ADD_FLAVOUR appends flavours with incrementing ids and optional metadata", () => {
    let state = baseState({
      step2: {
        flavours: [{ id: 2, name: "Vanilla", rating: 4, tags: [] }],
      },
    });

    state = logFlowReducer(state, {
      type: "ADD_FLAVOUR",
      name: "Strawberry",
      vitrineFlavourId: "vitrine-1",
      canonicalFlavourId: "canonical-1",
    });

    expect(state.step2.flavours).toHaveLength(2);
    expect(state.step2.flavours[1]).toEqual(
      expect.objectContaining({
        id: 3,
        name: "Strawberry",
        rating: null,
        vitrineFlavourId: "vitrine-1",
        canonicalFlavourId: "canonical-1",
      }),
    );

    state = logFlowReducer(state, { type: "ADD_FLAVOUR" });
    expect(state.step2.flavours[2]?.name).toBe("");
  });

  it("UPDATE_FLAVOUR_RATING updates only the matching flavour", () => {
    const state = logFlowReducer(
      baseState({
        step2: {
          flavours: [
            { id: 1, name: "Vanilla", rating: null, tags: [] },
            { id: 2, name: "Mint", rating: 3, tags: [] },
          ],
        },
      }),
      { type: "UPDATE_FLAVOUR_RATING", id: 1, rating: 5 },
    );

    expect(state.step2.flavours[0].rating).toBe(5);
    expect(state.step2.flavours[1].rating).toBe(3);
  });

  it("UPDATE_FLAVOUR merges a patch into the matching flavour", () => {
    const state = logFlowReducer(
      baseState({
        step2: {
          flavours: [{ id: 1, name: "Vanilla", rating: null, tags: [] }],
        },
      }),
      {
        type: "UPDATE_FLAVOUR",
        id: 1,
        patch: { name: "Madagascar Vanilla", tags: ["classic"], texture: 4 },
      },
    );

    expect(state.step2.flavours[0]).toEqual(
      expect.objectContaining({
        name: "Madagascar Vanilla",
        tags: ["classic"],
        texture: 4,
      }),
    );
  });

  it("REMOVE_FLAVOUR drops the matching flavour", () => {
    const state = logFlowReducer(
      baseState({
        step2: {
          flavours: [
            { id: 1, name: "Vanilla", rating: 4, tags: [] },
            { id: 2, name: "Mint", rating: 3, tags: [] },
          ],
        },
      }),
      { type: "REMOVE_FLAVOUR", id: 1 },
    );

    expect(state.step2.flavours).toEqual([{ id: 2, name: "Mint", rating: 3, tags: [] }]);
  });

  it("SET_VESSEL updates the vessel", () => {
    const state = logFlowReducer(baseState(), { type: "SET_VESSEL", vessel: "cone" });
    expect(state.step3.vessel).toBe("cone");
  });

  it("SET_PHOTO stores the file and resets photo visibility when cleared", () => {
    const file = new File(["photo"], "scoop.webp", { type: "image/webp" });
    let state = logFlowReducer(
      baseState({
        step3: {
          ...baseState().step3,
          photoVisibility: "followers",
        },
      }),
      { type: "SET_PHOTO", file },
    );

    expect(state.step3.photoFile).toBe(file);
    expect(state.step3.photoVisibility).toBe("followers");

    state = logFlowReducer(state, { type: "SET_PHOTO", file: null });
    expect(state.step3.photoFile).toBeNull();
    expect(state.step3.photoVisibility).toBe("public");
  });

  it("SET_NOTES, SET_VISIBILITY, and SET_PHOTO_VISIBILITY update step 3 fields", () => {
    let state = logFlowReducer(baseState(), { type: "SET_NOTES", notes: "Great texture" });
    state = logFlowReducer(state, { type: "SET_VISIBILITY", visibility: "private" });
    state = logFlowReducer(state, { type: "SET_PHOTO_VISIBILITY", photoVisibility: "followers" });

    expect(state.step3.notes).toBe("Great texture");
    expect(state.step3.visibility).toBe("private");
    expect(state.step3.photoVisibility).toBe("followers");
  });

  it("SET_WEATHER stores weather data", () => {
    const weather = {
      temperature: 24,
      apparentTemperature: 26,
      code: 1,
      label: "Sunny",
      emoji: "☀️",
      uvIndex: 6,
    };

    const state = logFlowReducer(baseState(), { type: "SET_WEATHER", weather });
    expect(state.step3.weather).toEqual(weather);
  });

  it("SET_PRICE updates only the provided price fields", () => {
    let state = logFlowReducer(baseState(), {
      type: "SET_PRICE",
      priceInput: "4,50",
      hidePrice: true,
      priceWarning: 2,
    });

    expect(state.step3.priceInput).toBe("4,50");
    expect(state.step3.hidePrice).toBe(true);
    expect(state.step3.priceWarning).toBe(2);

    state = logFlowReducer(state, { type: "SET_PRICE", priceInput: "5,00" });
    expect(state.step3.priceInput).toBe("5,00");
    expect(state.step3.hidePrice).toBe(true);
    expect(state.step3.priceWarning).toBe(2);
  });

  it("SET_OVERALL_RATING updates the overall rating", () => {
    const state = logFlowReducer(baseState(), { type: "SET_OVERALL_RATING", rating: 3 });
    expect(state.step3.overallRating).toBe(3);
  });

  it("GO_NEXT advances up to step 3 and GO_BACK retreats to step 1", () => {
    let state = baseState({ currentStep: 1 });

    state = logFlowReducer(state, { type: "GO_NEXT" });
    expect(state.currentStep).toBe(2);

    state = logFlowReducer(state, { type: "GO_NEXT" });
    expect(state.currentStep).toBe(3);

    state = logFlowReducer(state, { type: "GO_NEXT" });
    expect(state.currentStep).toBe(3);

    state = logFlowReducer(state, { type: "GO_BACK" });
    expect(state.currentStep).toBe(2);

    state = logFlowReducer(state, { type: "GO_BACK" });
    expect(state.currentStep).toBe(1);

    state = logFlowReducer(state, { type: "GO_BACK" });
    expect(state.currentStep).toBe(1);
  });

  it("returns the same state for unknown action types", () => {
    const state = baseState();
    const next = logFlowReducer(state, { type: "UNKNOWN" } as LogFlowAction);
    expect(next).toEqual(state);
  });
});

describe("canAdvanceFromStep1", () => {
  it("requires a non-empty salon name and date", () => {
    expect(
      canAdvanceFromStep1(
        baseState({
          step1: {
            salon: null,
            salonInput: "   ",
            date: "2026-06-06",
            hour: 12,
            minute: 0,
          },
        }),
      ),
    ).toBe(false);

    expect(
      canAdvanceFromStep1(
        baseState({
          step1: {
            salon: null,
            salonInput: "Gelato Palace",
            date: "   ",
            hour: 12,
            minute: 0,
          },
        }),
      ),
    ).toBe(false);

    expect(
      canAdvanceFromStep1(
        baseState({
          step1: {
            salon: null,
            salonInput: " Gelato Palace ",
            date: "2026-06-06",
            hour: 12,
            minute: 0,
          },
        }),
      ),
    ).toBe(true);
  });
});

describe("canAdvanceFromStep2", () => {
  it("requires at least one named flavour with rating >= 1", () => {
    expect(
      canAdvanceFromStep2(
        baseState({
          step2: {
            flavours: [{ id: 1, name: "Vanilla", rating: null, tags: [] }],
          },
        }),
      ),
    ).toBe(false);

    expect(
      canAdvanceFromStep2(
        baseState({
          step2: {
            flavours: [{ id: 1, name: "   ", rating: 5, tags: [] }],
          },
        }),
      ),
    ).toBe(false);

    expect(
      canAdvanceFromStep2(
        baseState({
          step2: {
            flavours: [{ id: 1, name: "Vanilla", rating: 0, tags: [] }],
          },
        }),
      ),
    ).toBe(false);

    expect(
      canAdvanceFromStep2(
        baseState({
          step2: {
            flavours: [{ id: 1, name: "Vanilla", rating: 1, tags: [] }],
          },
        }),
      ),
    ).toBe(true);

    expect(
      canAdvanceFromStep2(
        baseState({
          step2: {
            flavours: [
              { id: 1, name: "Vanilla", rating: null, tags: [] },
              { id: 2, name: " Mint ", rating: 4, tags: [] },
            ],
          },
        }),
      ),
    ).toBe(true);
  });
});

describe("flowFingerprint", () => {
  it("serializes state and replaces photo files with a sentinel", () => {
    const file = new File(["photo"], "scoop.webp", { type: "image/webp" });
    const state = logFlowReducer(baseState(), { type: "SET_PHOTO", file });
    const fingerprint = flowFingerprint(state);

    expect(fingerprint).toContain('"photoFile":"__file__"');
    expect(fingerprint).not.toContain("scoop.webp");
  });
});
