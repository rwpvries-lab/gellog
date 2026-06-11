import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * IDs of users the given viewer has blocked. Used to filter blocked authors out
 * of the feed (Apple Guideline 1.2). Returns [] for anonymous viewers or on error
 * so the feed degrades to "unfiltered" rather than empty.
 */
export async function fetchBlockedUserIds(
  supabase: SupabaseClient,
  viewerId: string | null | undefined,
): Promise<string[]> {
  if (!viewerId) return [];
  const { data } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", viewerId);
  return (data ?? []).map((r) => r.blocked_id as string);
}

/** PostgREST `in`-list literal, e.g. `(uuid1,uuid2)`. Null when there's nothing to exclude. */
export function blockedInListFilter(ids: string[]): string | null {
  if (ids.length === 0) return null;
  return `(${ids.join(",")})`;
}
