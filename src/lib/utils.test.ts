import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatVisitDate } from "./utils";

describe("formatVisitDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for very recent visits', () => {
    expect(formatVisitDate("2026-06-06T11:59:50.000Z")).toBe("Just now");
  });

  it("formats minutes and hours ago within the last day", () => {
    expect(formatVisitDate("2026-06-06T11:30:00.000Z")).toBe("30 mins ago");
    expect(formatVisitDate("2026-06-06T10:00:00.000Z")).toBe("2 hours ago");
  });

  it("formats older dates as calendar dates", () => {
    expect(formatVisitDate("2026-05-01T10:00:00.000Z")).toMatch(/May 1/);
  });
});
