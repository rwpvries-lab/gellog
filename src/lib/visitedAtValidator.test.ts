import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isVisitedAtValid } from "./visitedAtValidator";

describe("isVisitedAtValid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 6, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects invalid ISO strings", () => {
    expect(isVisitedAtValid("not-a-date")).toEqual({
      ok: false,
      reason: "Invalid date.",
    });
  });

  it("rejects future visit dates", () => {
    expect(isVisitedAtValid(new Date(2026, 5, 6, 12, 0, 1).toISOString())).toEqual({
      ok: false,
      reason: "Visit date can't be in the future.",
    });
  });

  it("accepts the current moment", () => {
    expect(isVisitedAtValid(new Date(2026, 5, 6, 12, 0, 0).toISOString())).toEqual({ ok: true });
  });

  it("rejects visits more than 7 days ago", () => {
    const tooOld = new Date(2026, 4, 29, 23, 59, 59);

    expect(isVisitedAtValid(tooOld.toISOString())).toEqual({
      ok: false,
      reason: "Visits can only be logged up to 7 days back.",
    });
  });

  it("accepts visits at the midnight cutoff exactly 7 days ago", () => {
    const cutoff = new Date(2026, 4, 30, 0, 0, 0);

    expect(isVisitedAtValid(cutoff.toISOString())).toEqual({ ok: true });
  });

  it("accepts visits within the 7-day window", () => {
    const yesterday = new Date(2026, 5, 5, 18, 30, 0);

    expect(isVisitedAtValid(yesterday.toISOString())).toEqual({ ok: true });
  });

  it("rejects an empty string", () => {
    expect(isVisitedAtValid("")).toEqual({
      ok: false,
      reason: "Invalid date.",
    });
  });

  it("rejects a visit one millisecond before the cutoff", () => {
    const justBeforeCutoff = new Date(2026, 4, 29, 23, 59, 59, 999);

    expect(isVisitedAtValid(justBeforeCutoff.toISOString())).toEqual({
      ok: false,
      reason: "Visits can only be logged up to 7 days back.",
    });
  });

  it("accepts a visit one millisecond after the cutoff", () => {
    const justAfterCutoff = new Date(2026, 4, 30, 0, 0, 0, 1);

    expect(isVisitedAtValid(justAfterCutoff.toISOString())).toEqual({ ok: true });
  });
});
