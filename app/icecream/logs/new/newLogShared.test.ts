import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildVisitedAt, describeWeatherCode, pad } from "./newLogShared";

describe("pad", () => {
  it("zero-pads single-digit numbers", () => {
    expect(pad(3)).toBe("03");
    expect(pad(12)).toBe("12");
  });
});

describe("buildVisitedAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 6, 14, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds a local datetime string for past times today", () => {
    expect(buildVisitedAt("2026-06-06", 10, 15)).toBe("2026-06-06T10:15");
  });

  it("clamps future times on today's date to the current clock", () => {
    expect(buildVisitedAt("2026-06-06", 16, 0)).toBe("2026-06-06T14:30");
  });

  it("does not clamp times on other dates", () => {
    expect(buildVisitedAt("2026-06-05", 23, 59)).toBe("2026-06-05T23:59");
  });
});

describe("describeWeatherCode", () => {
  it.each([
    [0, "Clear sky", "☀️"],
    [2, "Partly cloudy", "⛅️"],
    [45, "Foggy", "🌫️"],
    [61, "Rainy", "🌧️"],
    [71, "Snowy", "❄️"],
    [81, "Showers", "🌦️"],
    [95, "Thunderstorm", "⛈️"],
    [999, "Mixed conditions", "🌡️"],
  ] as const)("maps code %i to %s", (code, label, emoji) => {
    expect(describeWeatherCode(code)).toEqual({ label, emoji });
  });
});
