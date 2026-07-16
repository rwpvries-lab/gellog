import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import type { IceCreamLog } from "@/src/components/FeedCard";
import {
  applyResolvedFlavoursToLogRow,
  LOG_FLAVOURS_RESOLVED_SELECT,
} from "@/src/lib/log-flavours-resolved";
import { lookupPlaceName } from "@/src/lib/salon-place-lookup";
import { resolvePageTheme } from "@/src/lib/salonPageTheme";
import { SalonPageClient, type SalonProfile, type SalonVitrineResolvedRow } from "./SalonPageClient";

// Salon pages show the owner's own description and flavour names. On iOS,
// WKWebView/Safari offer to auto-translate page content, which distorts that
// original wording — opt the whole salon route out of translation.
export const metadata: Metadata = {
  other: { google: "notranslate" },
};

const FEED_FIELDS = `
  id,
  user_id,
  salon_name,
  salon_lat,
  salon_lng,
  salon_place_id,
  overall_rating,
  notes,
  photo_url,
  visited_at,
  created_at,
  vessel,
  price_cents,
  weather_temp_c,
  weather_condition,
  visibility,
  photo_visibility,
  hide_price,
  profiles (
    id,
    username,
    avatar_url
  ),
${LOG_FLAVOURS_RESOLVED_SELECT}
`;

export default async function SalonPage({
  params,
}: {
  params: Promise<{ place_id: string }>;
}) {
  const { place_id: placeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const vitrineSelect = supabase
    .from("vitrine_flavours_resolved")
    .select("*")
    .eq("salon_place_id", placeId)
    .eq("is_visible", true)
    .order("input_name", { ascending: true });

  const [{ data: logsData }, { data: profileRow }, { data: vitrineData }] = await Promise.all([
    supabase
      .from("ice_cream_logs")
      .select(FEED_FIELDS)
      .eq("salon_place_id", placeId)
      .eq("visibility", "public")
      .order("visited_at", { ascending: false }),
    supabase
      .from("salon_profiles")
      .select("*")
      .eq("place_id", placeId)
      .maybeSingle<SalonProfile>(),
    vitrineSelect,
  ]);

  const logs = ((logsData ?? []) as unknown as Record<string, unknown>[]).map((row) =>
    applyResolvedFlavoursToLogRow(row),
  ) as unknown as IceCreamLog[];
  let profile = profileRow ?? null;
  const vitrineResolvedRows = (vitrineData ?? []) as SalonVitrineResolvedRow[];

  if (logs.length === 0) {
    const name = await lookupPlaceName(placeId);
    if (!name) {
      notFound();
    }
    return (
      <SalonPageClient
        placeId={placeId}
        userId={user?.id ?? null}
        allLogs={[]}
        salonProfile={profile}
        emptyPlaceName={name}
        followingAuthorIds={[]}
        vitrineResolvedRows={vitrineResolvedRows}
        pageTheme={resolvePageTheme(profile?.page_theme)}
      />
    );
  }

  if (!profile) {
    const first = logs[0];
    if (user) {
      const { data: created } = await supabase
        .from("salon_profiles")
        .upsert(
          {
            place_id: placeId,
            is_claimed: false,
            salon_name: first.salon_name,
            salon_lat: first.salon_lat,
            salon_lng: first.salon_lng,
          },
          { onConflict: "place_id" },
        )
        .select()
        .maybeSingle<SalonProfile>();
      profile = created ?? null;
    }
  }

  const recentLogs = logs.slice(0, 10);
  const authorIds = [...new Set(recentLogs.map((l) => l.user_id))];
  let following: string[] = [];
  if (user && authorIds.length > 0) {
    const { data: friendRows } = await supabase
      .from("friendships")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", authorIds);
    following = (friendRows ?? []).map((r) => r.following_id);
  }

  return (
    <SalonPageClient
      placeId={placeId}
      userId={user?.id ?? null}
      allLogs={logs}
      salonProfile={profile}
      emptyPlaceName={null}
      followingAuthorIds={following}
      vitrineResolvedRows={vitrineResolvedRows}
      pageTheme={resolvePageTheme(profile?.page_theme)}
    />
  );
}
