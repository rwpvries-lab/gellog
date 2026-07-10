import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IceCreamLog } from "@/src/components/FeedCard";
import {
  applyResolvedFlavoursToLogRow,
  LOG_FLAVOURS_RESOLVED_SELECT,
} from "@/src/lib/log-flavours-resolved";

export const LOG_SELECT = `
  id, user_id, salon_name, salon_lat, salon_lng, salon_place_id,
  overall_rating, notes, photo_url, visited_at, created_at, vessel, price_cents,
  weather_temp_c, weather_condition, weather_uv_index, visibility,
  photo_visibility, hide_price,
  profiles ( id, username, avatar_url ),
${LOG_FLAVOURS_RESOLVED_SELECT}
`;

export type LogAccessResult =
  | { status: "not_found" }
  | {
      status: "ok";
      log: IceCreamLog;
      /** Reused by the caller so the viewer→author friendship isn't queried twice. */
      friendshipWithAuthor: { following_id: string } | null;
    };

/**
 * Fetches the log and enforces visibility (private/friends) before any other
 * data (comments, likes) is read. RLS does not enforce the friends-visibility
 * rule, so this app-level gate is the only enforcement — it must reject before
 * the caller fetches anything else.
 */
export async function resolveLogAccess(
  supabase: SupabaseClient,
  logId: string,
  viewer: { id: string } | null,
): Promise<LogAccessResult> {
  const { data: logData, error } = await supabase
    .from("ice_cream_logs")
    .select(LOG_SELECT)
    .eq("id", logId)
    .single();

  if (error || !logData) {
    return { status: "not_found" };
  }

  const raw = applyResolvedFlavoursToLogRow(
    logData as unknown as Record<string, unknown>,
  ) as unknown as IceCreamLog;

  if (raw.visibility === "private" && raw.user_id !== viewer?.id) {
    return { status: "not_found" };
  }

  let friendshipWithAuthor: { following_id: string } | null = null;
  if (raw.visibility === "friends") {
    if (!viewer) {
      return { status: "not_found" };
    }
    if (raw.user_id !== viewer.id) {
      const { data: friendship } = await supabase
        .from("friendships")
        .select("following_id")
        .eq("follower_id", viewer.id)
        .eq("following_id", raw.user_id)
        .maybeSingle();
      if (!friendship) {
        return { status: "not_found" };
      }
      friendshipWithAuthor = friendship;
    }
  }

  return { status: "ok", log: raw, friendshipWithAuthor };
}
