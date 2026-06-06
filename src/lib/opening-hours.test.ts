import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWeekHours,
  googlePeriodsToWeekHours,
  isOpenNow,
  todayKey,
  validateWeekHours,
} from "./opening-hours";

describe("googlePeriodsToWeekHours", () => {
  it("maps Google periods into week hours with closed defaults", () => {
    const hours = googlePeriodsToWeekHours([
      { open: { day: 1, time: "1000" }, close: { day: 1, time: "1800" } },
      { open: { day: 0, time: "0900" } },
    ]);

    expect(hours.monday).toEqual({ closed: false, open: "10:00", close: "18:00" });
    expect(hours.sunday).toEqual({ closed: false, open: "00:00", close: "23:59" });
    expect(hours.tuesday).toEqual({ closed: true });
  });
});

describe("isOpenNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 6, 14, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when the current clock falls inside today's hours", () => {
    expect(
      isOpenNow({
        ...defaultWeekHours(),
        friday: { closed: false, open: "10:00", close: "18:00" },
      }),
    ).toBe(true);
  });

  it("returns false when today is closed", () => {
    expect(
      isOpenNow({
        ...defaultWeekHours(),
        saturday: { closed: true },
      }),
    ).toBe(false);
  });
});

describe("todayKey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 6, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current weekday key", () => {
    expect(todayKey()).toBe("saturday");
  });
});

describe("validateWeekHours", () => {
  it("accepts a fully valid week-hours object", () => {
    expect(validateWeekHours(defaultWeekHours())).toEqual(defaultWeekHours());
  });

  it("rejects malformed objects", () => {
    expect(validateWeekHours(null)).toBeNull();
    expect(validateWeekHours({ monday: { closed: false, open: "9:00", close: "18:00" } })).toBeNull();
    expect(
      validateWeekHours({
        ...defaultWeekHours(),
        monday: { closed: false, open: "invalid", close: "18:00" },
      }),
    ).toBeNull();
  });
});

describe("defaultWeekHours", () => {
  it("opens weekdays and closes Sundays", () => {
    expect(defaultWeekHours().monday).toEqual({ closed: false, open: "10:00", close: "18:00" });
    expect(defaultWeekHours().sunday).toEqual({ closed: true });
    expect(defaultWeekHours().saturday.close).toBe("17:00");
  });
});
