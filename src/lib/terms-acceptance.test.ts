import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const preferencesGet = vi.fn();
const preferencesSet = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
  },
  registerPlugin: vi.fn(() => ({
    authorize: vi.fn(),
  })),
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: preferencesGet,
    set: preferencesSet,
  },
}));

vi.mock("@/src/lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/platform")>();
  return {
    ...actual,
    isCapacitorShell: vi.fn(() => false),
  };
});

import { isCapacitorShell } from "@/src/lib/platform";
import { getTermsAccepted, setTermsAccepted } from "./terms-acceptance";

describe("terms acceptance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(isCapacitorShell).mockReturnValue(false);
    preferencesGet.mockReset();
    preferencesSet.mockReset();
    localStorage.clear();
    delete (window as Window & { WEBVIEW_SERVER_URL?: string }).WEBVIEW_SERVER_URL;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as Window & { WEBVIEW_SERVER_URL?: string }).WEBVIEW_SERVER_URL;
  });

  async function flushBridgeWait(): Promise<void> {
    await vi.advanceTimersByTimeAsync(500);
  }

  it("reads acceptance from localStorage on web", async () => {
    localStorage.setItem("terms_accepted_v1", "true");

    const resultPromise = getTermsAccepted();
    await expect(resultPromise).resolves.toBe(true);
    expect(preferencesGet).not.toHaveBeenCalled();
  });

  it("shows the gate on web when localStorage is empty", async () => {
    await expect(getTermsAccepted()).resolves.toBe(false);
  });

  it("does not treat non-true localStorage values as accepted", async () => {
    localStorage.setItem("terms_accepted_v1", "false");

    await expect(getTermsAccepted()).resolves.toBe(false);
  });

  it("keeps web acceptance after reload semantics via localStorage", async () => {
    localStorage.setItem("terms_accepted_v1", "true");

    await expect(getTermsAccepted()).resolves.toBe(true);
    expect(preferencesGet).not.toHaveBeenCalled();
  });

  it("reads acceptance from Capacitor Preferences in the native shell", async () => {
    vi.mocked(isCapacitorShell).mockReturnValue(true);
    preferencesGet.mockResolvedValue({ value: "true" });

    await expect(getTermsAccepted()).resolves.toBe(true);
    expect(preferencesGet).toHaveBeenCalledWith({ key: "terms_accepted_v1" });
  });

  it("fail-closes in the native shell when Preferences is empty", async () => {
    vi.mocked(isCapacitorShell).mockReturnValue(true);
    preferencesGet.mockResolvedValue({ value: null });

    await expect(getTermsAccepted()).resolves.toBe(false);
  });

  it("fail-closes in the native shell when Preferences throws", async () => {
    vi.mocked(isCapacitorShell).mockReturnValue(true);
    preferencesGet.mockRejectedValue(new Error("plugin unavailable"));

    await expect(getTermsAccepted()).resolves.toBe(false);
  });

  it("does not fall back to localStorage in the native shell", async () => {
    vi.mocked(isCapacitorShell).mockReturnValue(true);
    preferencesGet.mockResolvedValue({ value: null });
    localStorage.setItem("terms_accepted_v1", "true");

    await expect(getTermsAccepted()).resolves.toBe(false);
  });

  it("fail-closes when the shell marker is present but the bridge never loads", async () => {
    (window as Window & { WEBVIEW_SERVER_URL?: string }).WEBVIEW_SERVER_URL =
      "https://www.gellog.app";
    preferencesGet.mockResolvedValue({ value: null });
    localStorage.setItem("terms_accepted_v1", "true");

    const resultPromise = getTermsAccepted();
    await flushBridgeWait();
    await expect(resultPromise).resolves.toBe(false);
    expect(preferencesGet).toHaveBeenCalledWith({ key: "terms_accepted_v1" });
  });

  it("uses Preferences when the shell marker appears before the bridge wait ends", async () => {
    (window as Window & { WEBVIEW_SERVER_URL?: string }).WEBVIEW_SERVER_URL =
      "https://www.gellog.app";
    preferencesGet.mockResolvedValue({ value: "true" });

    vi.mocked(isCapacitorShell)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    const resultPromise = getTermsAccepted();
    await vi.advanceTimersByTimeAsync(50);
    await expect(resultPromise).resolves.toBe(true);
    expect(preferencesGet).toHaveBeenCalledWith({ key: "terms_accepted_v1" });
  });

  it("persists acceptance to localStorage on web", async () => {
    await setTermsAccepted();

    expect(localStorage.getItem("terms_accepted_v1")).toBe("true");
    expect(preferencesSet).not.toHaveBeenCalled();
  });

  it("persists acceptance to Preferences in the native shell", async () => {
    vi.mocked(isCapacitorShell).mockReturnValue(true);
    preferencesSet.mockResolvedValue(undefined);

    await setTermsAccepted();

    expect(preferencesSet).toHaveBeenCalledWith({
      key: "terms_accepted_v1",
      value: "true",
    });
    expect(localStorage.getItem("terms_accepted_v1")).toBeNull();
  });

  it("does not write localStorage when the shell marker is present but the bridge never loads", async () => {
    (window as Window & { WEBVIEW_SERVER_URL?: string }).WEBVIEW_SERVER_URL =
      "https://www.gellog.app";
    preferencesSet.mockRejectedValue(new Error("plugin unavailable"));

    const writePromise = setTermsAccepted();
    await flushBridgeWait();
    await writePromise;

    expect(preferencesSet).toHaveBeenCalledWith({
      key: "terms_accepted_v1",
      value: "true",
    });
    expect(localStorage.getItem("terms_accepted_v1")).toBeNull();
  });
});
