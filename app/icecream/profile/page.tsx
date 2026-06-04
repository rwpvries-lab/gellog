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
import { gelatoTokensFromNullableTokens } from "@/src/lib/gelato-tokens";
import {
  applyResolvedFlavoursToLogRow,
  LOG_FLAVOURS_RESOLVED_SELECT,
} from "@/src/lib/log-flavours-resolved";
import {
  buildCanonicalFlavourRanking,
  type LogFlavoursResolvedRankingRow,
} from "@/src/lib/profile-flavour-ranking";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: "free" | "premium";
};

type LogFlavour = {
  id: string;
  flavour_name: string;
  rating: number | null;
  tags?: string[] | null;
  rating_texture: number | null;
  rating_originality: number | null;
  rating_intensity: number | null;
  rating_presentation: number | null;
};

type IceCreamLog = {
  id: string;
  salon_name: string;
  salon_place_id: string | null;
  salon_city: string | null;
  overall_rating: number;
  visited_at: string;
  price_cents: number | null;
  weather_condition: string | null;
  log_flavours: LogFlavour[];
};

type FlavourStats = {
  name: string;
  timesTried: number;
  ratingCount: number;
  ratingSum: number;
  textureSum: number;
  textureCount: number;
  originalitySum: number;
  originalityCount: number;
  intensitySum: number;
  intensityCount: number;
  presentationSum: number;
  presentationCount: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pick the Google place id that best matches logs for this salon name (visit count, then recency). */
function resolveSalonPlaceId(logs: IceCreamLog[], salonName: string): string | null {
  const name = salonName.trim();
  const counts = new Map<string, { visits: number; lastVisited: Date }>();
  for (const log of logs) {
    if (log.salon_name.trim() !== name) continue;
    const pid = log.salon_place_id?.trim();
    if (!pid) continue;
    const visited = new Date(log.visited_at);
    const cur = counts.get(pid);
    if (!cur) counts.set(pid, { visits: 1, lastVisited: visited });
    else {
      counts.set(pid, {
        visits: cur.visits + 1,
        lastVisited: visited > cur.lastVisited ? visited : cur.lastVisited,
      });
    }
  }
  if (counts.size === 0) return null;
  let bestId: string | null = null;
  let bestVisits = -1;
  let bestLast = new Date(0);
  for (const [pid, { visits, lastVisited }] of counts) {
    if (visits > bestVisits || (visits === bestVisits && lastVisited > bestLast)) {
      bestId = pid;
      bestVisits = visits;
      bestLast = lastVisited;
    }
  }
  return bestId;
}

function deriveStats(logs: IceCreamLog[]) {
  const totalAllTime = logs.length;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const totalThisYear = logs.filter(
    (log) => new Date(log.visited_at) >= startOfYear,
  ).length;

  const averageOverallRating =
    logs.length > 0
      ? logs.reduce((sum, log) => sum + log.overall_rating, 0) / logs.length
      : null;

  const flavourMap = new Map<string, FlavourStats>();

  logs.forEach((log) => {
    (log.log_flavours ?? []).forEach((flavour) => {
      const key = flavour.flavour_name.trim();
      if (!key) return;

      const existing = flavourMap.get(key) ?? {
        name: key,
        timesTried: 0,
        ratingCount: 0,
        ratingSum: 0,
        textureSum: 0,
        textureCount: 0,
        originalitySum: 0,
        originalityCount: 0,
        intensitySum: 0,
        intensityCount: 0,
        presentationSum: 0,
        presentationCount: 0,
      };

      existing.timesTried += 1;
      if (flavour.rating != null) {
        existing.ratingCount += 1;
        existing.ratingSum += flavour.rating;
      }
      if (flavour.rating_texture != null) {
        existing.textureCount += 1;
        existing.textureSum += flavour.rating_texture;
      }
      if (flavour.rating_originality != null) {
        existing.originalityCount += 1;
        existing.originalitySum += flavour.rating_originality;
      }
      if (flavour.rating_intensity != null) {
        existing.intensityCount += 1;
        existing.intensitySum += flavour.rating_intensity;
      }
      if (flavour.rating_presentation != null) {
        existing.presentationCount += 1;
        existing.presentationSum += flavour.rating_presentation;
      }

      flavourMap.set(key, existing);
    });
  });

  const salonMap = new Map<
    string,
    { name: string; count: number; lastVisited: Date }
  >();

  logs.forEach((log) => {
    const key = log.salon_name.trim();
    if (!key) return;
    const visited = new Date(log.visited_at);
    const existing = salonMap.get(key);
    if (!existing) {
      salonMap.set(key, { name: key, count: 1, lastVisited: visited });
    } else {
      salonMap.set(key, {
        name: existing.name,
        count: existing.count + 1,
        lastVisited:
          visited > existing.lastVisited ? visited : existing.lastVisited,
      });
    }
  });

  const mostVisitedSalon =
    salonMap.size > 0
      ? Array.from(salonMap.values()).sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.lastVisited.getTime() - a.lastVisited.getTime();
        })[0]
      : null;

  const weatherCounts = new Map<string, number>();
  logs.forEach((log) => {
    const condition = log.weather_condition?.trim();
    if (!condition) return;
    weatherCounts.set(condition, (weatherCounts.get(condition) ?? 0) + 1);
  });
  const bestWeather =
    weatherCounts.size > 0
      ? Array.from(weatherCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  const logsWithPrice = logs.filter((log) => log.price_cents != null);
  const totalSpent =
    logsWithPrice.length >= 3
      ? logsWithPrice.reduce(
          (sum, log) => sum + (log.price_cents ?? 0) / 100,
          0,
        )
      : null;
  const averagePerVisit =
    logsWithPrice.length >= 3 ? totalSpent! / logsWithPrice.length : null;

  const flavoursRollup = Array.from(flavourMap.values())
    .map((s) => ({ name: s.name, timesTried: s.timesTried }))
    .sort(
      (a, b) =>
        b.timesTried - a.timesTried || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  const salonsRollup = Array.from(salonMap.values())
    .map((s) => ({
      name: s.name,
      visitCount: s.count,
      lastVisitedIso: s.lastVisited.toISOString(),
      placeId: resolveSalonPlaceId(logs, s.name),
    }))
    .sort(
      (a, b) =>
        b.visitCount - a.visitCount ||
        b.lastVisitedIso.localeCompare(a.lastVisitedIso),
    );

  return {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    mostVisitedSalon,
    bestWeather,
    totalSpent,
    averagePerVisit,
    uniqueFlavourCount: flavourMap.size,
    uniqueSalonCount: salonMap.size,
    flavoursRollup,
    salonsRollup,
  };
}

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
  ) as unknown as IceCreamLog[];

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

    type LfRow = {
      log_id: string;
      flavour_name: string;
      rating_stars: number | null;
      canonical_flavour_id?: string | null;
      base_token?: string | null;
      drizzle_token?: string | null;
      crumble_token?: string | null;
      canonical_name_en?: string | null;
      canonical_name_nl?: string | null;
      canonical_name_it?: string | null;
    };

    const resolvedLike: LogFlavoursResolvedRankingRow[] = (lfRows ?? []).map((r) => {
      const row = r as LfRow;
      return {
        log_id: row.log_id,
        flavour_id: null,
        flavour_slug: null,
        canonical_name_nl: row.canonical_name_nl ?? null,
        canonical_name_en: row.canonical_name_en ?? null,
        base_token: row.base_token ?? null,
        drizzle_token: row.drizzle_token ?? null,
        crumble_token: row.crumble_token ?? null,
        rating: row.rating_stars != null ? Number(row.rating_stars) : null,
        input_name: typeof row.flavour_name === "string" ? row.flavour_name : null,
      };
    });

    const { ranking, uncategorisedLogCount: uncLogs, uncategorisedInputNames: uncNames } =
      buildCanonicalFlavourRanking(resolvedLike);

    rankedFlavours = ranking.map((r) => ({
      rank: r.rank,
      flavourId: r.flavourId,
      displayName: r.displayName,
      logCount: r.logCount,
      avgRating: r.avgRating,
      tokens: gelatoTokensFromNullableTokens(r.baseToken, r.drizzleToken, r.crumbleToken),
    }));
    uncategorisedLogCount = uncLogs;
    uncategorisedInputNames = uncNames;
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
          />
        </section>
    </AppShell>
  );
}
