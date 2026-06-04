import { AppShell } from "@/app/components/AppShell";
import { createClient } from "@/src/lib/supabase/server";
import type { IceCreamLog as FeedIceCreamLog } from "@/src/components/FeedCard";
import { PublicBanner, PUBLIC_BANNER_LAYOUT_PX } from "@/src/components/PublicBanner";
import { notFound } from "next/navigation";
import { PublicProfileHeader } from "./PublicProfileHeader";
import { ProfileSummaryCard } from "@/app/icecream/profile/ProfileSummaryCard";
import { ProfileGellogClient } from "@/app/icecream/profile/ProfileGellogClient";
import { ProfileFeedClient } from "@/app/icecream/profile/ProfileFeedClient";
import type { ProfileSheetRankedFlavour } from "@/app/icecream/profile/ProfileSheet";
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

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

const FEED_PAGE_SIZE = 10;

const FEED_FIELDS = `
  id, user_id, salon_name, salon_city, salon_lat, salon_lng, salon_place_id,
  overall_rating, notes, photo_url, visited_at, created_at, vessel, price_cents,
  weather_temp_c, weather_condition, weather_uv_index, visibility, photo_visibility,
  hide_price,
  profiles (id, username, avatar_url),
${LOG_FLAVOURS_RESOLVED_SELECT}
`;

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .single<Profile>();

  if (!profile) {
    notFound();
  }

  const isOwnProfile = user?.id === profile.id;

  // Determine whether the viewer follows the owner first — it widens what they may see.
  const { count: isFollowingCount } =
    user && !isOwnProfile
      ? await supabase
          .from("friendships")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
      : { count: 0 };
  const isFollowing = (isFollowingCount ?? 0) > 0;

  // RLS does not actually hide private logs (a permissive `select_all` policy exists),
  // so we explicitly scope to what this visitor may see: public + friends-if-following.
  const allowedVisibility = isFollowing ? ["public", "friends"] : ["public"];

  const [
    { count: followerCount },
    { count: followingCount },
    { data: statsLogsData },
    { data: feedLogsData },
  ] = await Promise.all([
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    supabase
      .from("ice_cream_logs")
      .select(
        `id, salon_name, salon_place_id, salon_city, overall_rating, visited_at, price_cents, weather_condition,
${LOG_FLAVOURS_RESOLVED_SELECT}`,
      )
      .eq("user_id", profile.id)
      .in("visibility", allowedVisibility),
    supabase
      .from("ice_cream_logs")
      .select(FEED_FIELDS)
      .eq("user_id", profile.id)
      .in("visibility", allowedVisibility)
      .order("visited_at", { ascending: false })
      .limit(FEED_PAGE_SIZE),
  ]);

  const statsLogs = ((statsLogsData ?? []) as unknown as Record<string, unknown>[]).map(
    (row) => applyResolvedFlavoursToLogRow(row),
  ) as unknown as StatsLog[];

  const feedLogs = ((feedLogsData ?? []) as unknown as Record<string, unknown>[]).map(
    (row) => applyResolvedFlavoursToLogRow(row),
  ) as unknown as FeedIceCreamLog[];

  const {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    mostVisitedSalon,
    bestWeather,
    uniqueFlavourCount,
    uniqueSalonCount,
    flavoursRollup,
    salonsRollup,
  } = deriveStats(statsLogs);

  const logIds = statsLogs.map((l) => l.id);
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

  const displayName =
    profile.display_name?.trim() || profile.username?.trim() || "Ice cream lover";
  const initial = displayName.charAt(0).toUpperCase();
  const feedEmptyLabel = `@${profile.username ?? displayName} hasn't logged any public gelato yet.`;

  return (
    <>
      <AppShell
        contentClassName="pb-4"
        mainStyle={
          user
            ? undefined
            : { paddingBottom: `calc(6rem + ${PUBLIC_BANNER_LAYOUT_PX}px)` }
        }
      >
        <PublicProfileHeader
          displayName={displayName}
          initial={initial}
          avatarUrl={profile.avatar_url}
          username={profile.username ?? ""}
          followerCount={followerCount ?? 0}
          followingCount={followingCount ?? 0}
          viewerId={user?.id}
          targetUserId={profile.id}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
        />

        <ProfileSummaryCard
          flavourCount={uniqueFlavourCount}
          logCount={totalAllTime}
          salonCount={uniqueSalonCount}
          flavoursRollup={flavoursRollup}
          salonsRollup={salonsRollup}
        />

        {/* Read-only public stats: Stats + Flavour ranking only (no Activity / spend). */}
        <ProfileGellogClient
          publicView
          stats={{
            totalAllTime,
            totalThisYear,
            averageOverallRating,
            mostVisitedSalon,
            bestWeather,
            totalSpent: null,
            averagePerVisit: null,
          }}
          rankedFlavours={rankedFlavours}
          uncategorisedLogCount={uncategorisedLogCount}
          uncategorisedInputNames={uncategorisedInputNames}
          heatmapData={{}}
        />

        {/* Public logs feed (read-only) */}
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
            {isOwnProfile ? "Your public logs" : "Logs"}
          </p>
          <ProfileFeedClient
            initialLogs={feedLogs}
            pageSize={FEED_PAGE_SIZE}
            currentUserId={user?.id}
            targetUserId={profile.id}
            visibilityFilter={allowedVisibility}
            viewerFollowsAuthor={isOwnProfile || isFollowing}
            emptyLabel={feedEmptyLabel}
          />
        </section>
      </AppShell>

      {!user ? (
        <PublicBanner variant="profile" profileHandle={profile.username ?? username} />
      ) : null}
    </>
  );
}
