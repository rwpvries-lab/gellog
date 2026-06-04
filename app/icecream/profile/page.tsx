import { AppShell } from "@/app/components/AppShell";
import { createClient } from "@/src/lib/supabase/server";
import type { IceCreamLog as FeedIceCreamLog } from "@/src/components/FeedCard";
import { redirect } from "next/navigation";
import type { HeatmapDayData } from "./IceCreamHeatmap";
import { ProfileGellogClient } from "./ProfileGellogClient";
import { ProfileFeedClient } from "./ProfileFeedClient";
import { MySalonProfileCard } from "@/app/components/MySalonOwnerAccess";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileSummaryCard } from "./ProfileSummaryCard";
import { ProfilePassportStrip, type CityStampWithEarned } from "./ProfilePassportStrip";
import type { ProfileSheetRankedFlavour } from "./ProfileSheet";
import {
  applyResolvedFlavoursToLogRow,
  LOG_FLAVOURS_RESOLVED_SELECT,
} from "@/src/lib/log-flavours-resolved";
import {
  deriveStats,
  buildRankedFlavours,
  type StatsLog,
  type LogFlavourRankingInputRow,
} from "@/src/lib/profile-stats";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: "free" | "premium";
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const FEED_PAGE_SIZE = 10;

export default async function IceCreamProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/icecream/profile");
  }

  const [
    { data: profile },
    { data: logsData, error: logsError },
    { data: feedLogsData },
    { count: followerCount },
    { count: followingCount },
    { data: cityStampsData },
    { data: userStampsData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, subscription_tier")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("ice_cream_logs")
      .select(
        `id, salon_name, salon_place_id, salon_city, overall_rating, visited_at, price_cents, weather_condition,
${LOG_FLAVOURS_RESOLVED_SELECT}`,
      )
      .eq("user_id", user.id),
    supabase
      .from("ice_cream_logs")
      .select(
        `id, user_id, salon_name, salon_city, salon_lat, salon_lng, salon_place_id,
         overall_rating, notes, photo_url, visited_at, vessel, price_cents,
         weather_temp_c, weather_condition, weather_uv_index, visibility, photo_visibility,
         hide_price,
         profiles (id, username, avatar_url),
${LOG_FLAVOURS_RESOLVED_SELECT}`,
      )
      .eq("user_id", user.id)
      .order("visited_at", { ascending: false })
      .limit(FEED_PAGE_SIZE),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id),
    supabase
      .from("city_stamps")
      .select("city_key, city_name, country, landmark_label, colour_primary, colour_secondary")
      .order("city_name"),
    supabase
      .from("user_stamps")
      .select("city_key, earned_at")
      .eq("user_id", user.id),
  ]);

  const logs = ((logsData ?? []) as unknown as Record<string, unknown>[]).map((row) =>
    applyResolvedFlavoursToLogRow(row),
  ) as unknown as StatsLog[];

  if (logsError) {
     
    console.error("Failed to load user ice cream logs:", logsError);
  }

  const feedLogs = ((feedLogsData ?? []) as unknown as Record<string, unknown>[]).map((row) =>
    applyResolvedFlavoursToLogRow(row),
  ) as unknown as FeedIceCreamLog[];

  const {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    mostVisitedSalon,
    bestWeather,
    totalSpent,
    averagePerVisit,
    uniqueFlavourCount,
    uniqueSalonCount,
    flavoursRollup,
    salonsRollup,
  } = deriveStats(logs);

  const logIds = logs.map((l) => l.id);
  let rankedFlavours: ProfileSheetRankedFlavour[] = [];
  let uncategorisedLogCount = 0;
  let uncategorisedInputNames: string[] = [];

  if (logIds.length > 0) {
    const { data: lfRows } = await supabase
      .from("log_flavours")
      .select(
        "log_id, flavour_name, rating_stars, base_token, drizzle_token, crumble_token, canonical_name_en, canonical_name_nl, canonical_name_it, canonical_flavour_id",
      )
      .in("log_id", logIds);

    ({ rankedFlavours, uncategorisedLogCount, uncategorisedInputNames } =
      buildRankedFlavours((lfRows ?? []) as unknown as LogFlavourRankingInputRow[]));
  }

  const hasIceCreamPlus = profile?.subscription_tier === "premium";

  const earnedCityKeys = new Set((userStampsData ?? []).map((s) => s.city_key));
  const earnedAtMap = new Map(
    (userStampsData ?? []).map((s) => [s.city_key, s.earned_at as string]),
  );
  const cityStamps: CityStampWithEarned[] = (cityStampsData ?? []).map((cs) => ({
    city_key: cs.city_key,
    city_name: cs.city_name,
    country: cs.country,
    landmark_label: cs.landmark_label ?? null,
    colour_primary: cs.colour_primary ?? null,
    colour_secondary: cs.colour_secondary ?? null,
    earned: earnedCityKeys.has(cs.city_key),
    earned_at: earnedAtMap.get(cs.city_key) ?? null,
  }));

  const heatmapData: Record<string, HeatmapDayData> = {};
  logs.forEach((log) => {
    const dateStr = log.visited_at.slice(0, 10);
    if (!heatmapData[dateStr]) {
      heatmapData[dateStr] = { count: 0, salons: [] };
    }
    heatmapData[dateStr].count += 1;
    if (!heatmapData[dateStr].salons.includes(log.salon_name)) {
      heatmapData[dateStr].salons.push(log.salon_name);
    }
  });

  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    user.email ||
    "Ice cream lover";

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <AppShell contentClassName="pb-4">
        {/* ── Profile header (Figma: actions, avatar, name, @handle, follow stats) ── */}
        <ProfileHeader
          displayName={displayName}
          initial={initial}
          avatarUrl={profile?.avatar_url ?? null}
          userId={user.id}
          username={profile?.username ?? ""}
          followerCount={followerCount ?? 0}
          followingCount={followingCount ?? 0}
        />

        <ProfileSummaryCard
          flavourCount={uniqueFlavourCount}
          logCount={totalAllTime}
          salonCount={uniqueSalonCount}
          flavoursRollup={flavoursRollup}
          salonsRollup={salonsRollup}
        />

        {/* Quick access: stats / flavours / activity sheets; passport → full page (Ice Cream+ only) */}
        <ProfileGellogClient
          hasIceCreamPlus={hasIceCreamPlus}
          stats={{
            totalAllTime,
            totalThisYear,
            averageOverallRating,
            mostVisitedSalon,
            bestWeather,
            totalSpent,
            averagePerVisit,
          }}
          rankedFlavours={rankedFlavours}
          uncategorisedLogCount={uncategorisedLogCount}
          uncategorisedInputNames={uncategorisedInputNames}
          heatmapData={heatmapData}
        />

        <MySalonProfileCard />

        <ProfilePassportStrip stamps={cityStamps} />

        {/* Your logs feed */}
        <section id="profile-your-logs">
          <p
            style={{
              color: "var(--color-teal)",
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
            className="mb-3 scroll-mt-6"
          >
            Your logs
         </p>
          <ProfileFeedClient
            initialLogs={feedLogs}
            pageSize={FEED_PAGE_SIZE}
            currentUserId={user.id}
            targetUserId={user.id}
            canManage
          />
        </section>
    </AppShell>
  );
}
