import { describe, expect, it, vi } from "vitest";
import { createMockSupabase } from "@/src/test-helpers/mockSupabase";
import {
  getOwnerVerifiedSalonCount,
  isAtVerifiedSalonCap,
  OWNER_VERIFIED_SALON_CAP,
} from "./ownerSalonCap";

describe("getOwnerVerifiedSalonCount", () => {
  it("uses the RPC result when available", async () => {
    const supabase = createMockSupabase();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 2, error: null } as never);

    await expect(getOwnerVerifiedSalonCount(supabase, "owner-1")).resolves.toBe(2);
    expect(supabase.rpc).toHaveBeenCalledWith("get_owner_salon_count", { owner_uuid: "owner-1" });
  });

  it("falls back to counting verified salon_profiles rows", async () => {
    const supabase = createMockSupabase();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error("rpc missing") } as never);

    const thirdEq = vi.fn().mockResolvedValue({ count: 3, error: null });
    const secondEq = vi.fn().mockReturnValue({ eq: thirdEq });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: firstEq }),
    } as never);

    await expect(getOwnerVerifiedSalonCount(supabase, "owner-1")).resolves.toBe(3);
    expect(firstEq).toHaveBeenCalledWith("owner_id", "owner-1");
    expect(secondEq).toHaveBeenCalledWith("is_claimed", true);
    expect(thirdEq).toHaveBeenCalledWith("claim_verified", true);
  });

  it("returns 0 when the fallback count query fails", async () => {
    const supabase = createMockSupabase();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error("rpc missing") } as never);

    const thirdEq = vi.fn().mockResolvedValue({ count: null, error: new Error("db down") });
    const secondEq = vi.fn().mockReturnValue({ eq: thirdEq });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: firstEq }),
    } as never);

    await expect(getOwnerVerifiedSalonCount(supabase, "owner-1")).resolves.toBe(0);
  });
});

describe("isAtVerifiedSalonCap", () => {
  it("uses a cap of three verified salons", () => {
    expect(OWNER_VERIFIED_SALON_CAP).toBe(3);
  });

  it("returns false below the cap and true at or above it", () => {
    expect(isAtVerifiedSalonCap(2)).toBe(false);
    expect(isAtVerifiedSalonCap(3)).toBe(true);
  });
});
