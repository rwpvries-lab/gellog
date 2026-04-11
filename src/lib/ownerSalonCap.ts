import type { SupabaseClient } from "@supabase/supabase-js";

const SALON_CAP = 3;

/**
 * Verified claims = is_claimed and claim_verified (admin-approved).
 * Uses RPC when available; falls back to a count query (same semantics).
 */
export async function getOwnerVerifiedSalonCount(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<number> {
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_owner_salon_count", {
    owner_uuid: ownerId,
  });
  if (!rpcError && rpcData !== null && rpcData !== undefined) {
    return Number(rpcData);
  }

  const { count, error } = await supabase
    .from("salon_profiles")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("is_claimed", true)
    .eq("claim_verified", true);

  if (error) return 0;
  return count ?? 0;
}

export function isAtVerifiedSalonCap(count: number): boolean {
  return count >= SALON_CAP;
}

export const OWNER_VERIFIED_SALON_CAP = SALON_CAP;
