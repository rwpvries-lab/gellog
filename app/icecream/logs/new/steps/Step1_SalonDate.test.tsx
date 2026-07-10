import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkGeolocationPermission, getCurrentPosition } from "@/src/lib/geolocation";
import { createInitialLogFlowState } from "../logFlowReducer";
import { Step1_SalonDate } from "./Step1_SalonDate";

vi.mock("@/src/lib/geolocation", () => ({
  checkGeolocationPermission: vi.fn(),
  getCurrentPosition: vi.fn(),
}));

function renderStep1() {
  const state = createInitialLogFlowState({ defaultVisibility: "public" });
  const dispatch = vi.fn();
  render(
    <Step1_SalonDate state={state} dispatch={dispatch} userId="user-1" />,
  );
}

describe("Step1_SalonDate location bias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", { geolocation: {} });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "OK", predictions: [] }),
      }),
    );
  });

  it("never calls getCurrentPosition when permission is not already granted", async () => {
    vi.mocked(checkGeolocationPermission).mockResolvedValue("prompt");

    renderStep1();

    await waitFor(() => {
      expect(checkGeolocationPermission).toHaveBeenCalledTimes(1);
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("omits locationBias from the autocomplete request when permission is not granted", async () => {
    vi.mocked(checkGeolocationPermission).mockResolvedValue("denied");

    renderStep1();
    await waitFor(() => expect(checkGeolocationPermission).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText("e.g. Gelateria Roma"), {
      target: { value: "gelateria" },
    });

    await waitFor(() => expect(fetch).toHaveBeenCalled(), { timeout: 2000 });
    const requestedUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.has("locationBias")).toBe(false);
  });

  it("fetches position once (no permission prompt) and biases the request when already granted", async () => {
    vi.mocked(checkGeolocationPermission).mockResolvedValue("granted");
    vi.mocked(getCurrentPosition).mockImplementation((success) => {
      success({
        coords: { latitude: 52.37, longitude: 4.89 },
      } as GeolocationPosition);
    });
    renderStep1();

    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("e.g. Gelateria Roma"), {
      target: { value: "gelateria" },
    });

    await waitFor(() => expect(fetch).toHaveBeenCalled(), { timeout: 2000 });
    const requestedUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.get("locationBias")).toBe(
      "circle:50000@52.37,4.89",
    );
  });
});
