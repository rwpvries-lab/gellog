import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avatarColour, timeAgo } from "./CommentsSection";

describe("avatarColour", () => {
  it("maps usernames to one of five avatar CSS variables", () => {
    expect(avatarColour("alice")).toMatch(/^var\(--color-avatar-[0-4]\)$/);
    expect(avatarColour(null)).toBe("var(--color-avatar-0)");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats recent timestamps compactly", () => {
    expect(timeAgo("2026-06-06T11:59:50.000Z")).toBe("just now");
    expect(timeAgo("2026-06-06T11:30:00.000Z")).toBe("30m");
    expect(timeAgo("2026-06-06T09:00:00.000Z")).toBe("3h");
    expect(timeAgo("2026-06-04T12:00:00.000Z")).toBe("2d");
    expect(timeAgo("2026-05-20T12:00:00.000Z")).toBe("2w");
  });
});
