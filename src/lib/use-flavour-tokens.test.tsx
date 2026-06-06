import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/src/lib/supabase/client";
import { useFlavourTokens } from "./use-flavour-tokens";

vi.mock("@/src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("useFlavourTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback tokens for empty flavour names", () => {
    const { result } = renderHook(() => useFlavourTokens("   "));
    expect(result.current).toEqual({
      tokens: { base: "cream", drizzle: "none", crumble: "none" },
      loading: false,
      resolved: false,
    });
  });

  it("resolves tokens from the Supabase RPC", async () => {
    vi.mocked(createClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            base_token: "strawberry-pink",
            drizzle_token: "none",
            crumble_token: "fruit-chunks-red",
          },
        ],
        error: null,
      }),
    } as never);

    const { result } = renderHook(() => useFlavourTokens("Strawberry"));

    await waitFor(() => {
      expect(result.current.resolved).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tokens).toEqual({
      base: "strawberry-pink",
      drizzle: "none",
      crumble: "fruit-chunks-red",
    });
  });

  it("falls back when RPC fails", async () => {
    vi.mocked(createClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") }),
    } as never);

    const { result } = renderHook(() => useFlavourTokens("Mystery"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tokens).toEqual({
      base: "cream",
      drizzle: "none",
      crumble: "none",
    });
    expect(result.current.resolved).toBe(false);
  });
});
