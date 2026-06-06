import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/src/lib/supabase/client";
import { useFlavourScoop } from "./flavour-scoop";

vi.mock("@/src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("useFlavourScoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to strawberry defaults when the slug is missing", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as never);

    const { result } = renderHook(() => useFlavourScoop("Unknown Flavour"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.slug).toBe("unknown-flavour");
    expect(result.current.scoopUrl).toBe("/assets/scoops/unknown-flavour.svg");
    expect(result.current.baseColor).toBe("#F9A8D4");
  });

  it("loads scoop colours from the flavours table", async () => {
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                name: "Pistachio",
                slug: "pistachio",
                base_color: "#A7C957",
                shine_color: "#8FB043",
                accent_color: "#E8F5E9",
              },
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    const { result } = renderHook(() => useFlavourScoop("Pistachio"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        slug: "pistachio",
        label: "Pistachio",
        baseColor: "#A7C957",
        scoopUrl: "/assets/scoops/pistachio.svg",
      }),
    );
  });
});
