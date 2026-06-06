import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/platform", () => ({
  isNativePlatform: vi.fn(() => false),
}));

import { isNativePlatform } from "@/src/lib/platform";
import { checkGeolocationPermission, getCurrentPosition } from "./geolocation";

describe("checkGeolocationPermission", () => {
  beforeEach(() => {
    vi.mocked(isNativePlatform).mockReturnValue(false);
  });

  it("maps granted browser permission to granted", async () => {
    vi.stubGlobal("navigator", {
      permissions: {
        query: vi.fn().mockResolvedValue({ state: "granted" }),
      },
    });

    await expect(checkGeolocationPermission()).resolves.toBe("granted");
  });

  it("returns prompt when the Permissions API is unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(checkGeolocationPermission()).resolves.toBe("prompt");
  });
});

describe("getCurrentPosition", () => {
  it("delegates to navigator.geolocation on web", () => {
    const success = vi.fn();
    const browserGetCurrentPosition = vi.fn((onSuccess: PositionCallback) => {
      onSuccess({
        coords: { latitude: 52.1, longitude: 5.1, accuracy: 10 },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: browserGetCurrentPosition } });

    getCurrentPosition(success);

    expect(browserGetCurrentPosition).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith(
      expect.objectContaining({
        coords: expect.objectContaining({ latitude: 52.1, longitude: 5.1 }),
      }),
    );
  });

  it("reports unavailable geolocation with POSITION_UNAVAILABLE", () => {
    const error = vi.fn();
    vi.stubGlobal("navigator", {});

    getCurrentPosition(vi.fn(), error);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ code: 2, message: "Geolocation is not available." }),
    );
  });
});
