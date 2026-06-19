import { describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
  registerPlugin: vi.fn(() => ({
    authorize: vi.fn(),
  })),
}));

import { Capacitor } from "@capacitor/core";
import { isAppleSignInAvailable } from "./apple-signin";
import { isNativePlatform } from "./platform";

describe("platform helpers", () => {
  it("detects native platform via Capacitor", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(isNativePlatform()).toBe(true);

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    expect(isNativePlatform()).toBe(false);
  });

  it("enables Apple Sign-In only on iOS", () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    expect(isAppleSignInAvailable()).toBe(true);

    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
    expect(isAppleSignInAvailable()).toBe(false);
  });
});
