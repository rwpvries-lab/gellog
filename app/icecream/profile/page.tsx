import { createClient } from "@/src/lib/supabase/server";
import type { IceCreamLog as FeedIceCreamLog } from "@/src/components/FeedCard";
import { redirect } from "next/navigation";
import type { HeatmapDayData } from "./IceCreamHeatmap";
import { ProfileGellogClient } from "./ProfileGellogClient";
import { ProfileFeedClient } from "./ProfileFeedClient";
import { ProfileHeader } from "./ProfileHeader";
import { ActivitySection, type WeekData } from "./ActivitySection";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type LogFlavour = {
  id: string;
  flavour_name: string;
  rating: number | null;
  rating_texture: number | null;
  rating_originality: number | null;
  rating_intensity: number | null;
  rating_presentation: number | null;
};

type IceCreamLog = {
  id: string;
  salon_name: string;
  overall_rating: number;
  visited_at: string;
  price_paid: number | null;
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

type RankedFlavour = {
  rank: number;
  name: string;
  timesTried: number;
  averageRating: number;
  avgTexture: number | null;
  avgOriginality: number | null;
  avgIntensity: number | null;
  avgPresentation: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  const allFlavourStats = Array.from(flavourMap.values()).map((stat) => ({
    ...stat,
    averageRating:
      stat.ratingCount > 0 ? stat.ratingSum / stat.ratingCount : null,
  }));

  const rankedFlavours: RankedFlavour[] = allFlavourStats
    .filter((stat) => stat.timesTried >= 2 && stat.averageRating != null)
    .sort((a, b) => {
      const aAvg = a.averageRating ?? 0;
      const bAvg = b.averageRating ?? 0;
      if (bAvg !== aAvg) return bAvg - aAvg;
      if (b.timesTried !== a.timesTried) return b.timesTried - a.timesTried;
      return a.name.localeCompare(b.name);
    })
    .map((stat, index) => ({
      rank: index + 1,
      name: stat.name,
      timesTried: stat.timesTried,
      averageRating: stat.averageRating ?? 0,
      avgTexture:
        stat.textureCount > 0 ? stat.textureSum / stat.textureCount : null,
      avgOriginality:
        stat.originalityCount > 0
          ? stat.originalitySum / stat.originalityCount
          : null,
      avgIntensity:
        stat.intensityCount > 0
          ? stat.intensitySum / stat.intensityCount
          : null,
      avgPresentation:
        stat.presentationCount > 0
          ? stat.presentationSum / stat.presentationCount
          : null,
    }));

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

  const logsWithPrice = logs.filter((log) => log.price_paid != null);
  const totalSpent =
    logsWithPrice.length >= 3
      ? logsWithPrice.reduce((sum, log) => sum + (log.price_paid ?? 0), 0)
      : null;
  const averagePerVisit =
    logsWithPrice.length >= 3 ? totalSpent! / logsWithPrice.length : null;

  return {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    rankedFlavours,
    mostVisitedSalon,
    bestWeather,
    totalSpent,
    averagePerVisit,
  };
}

function computeWeeklyData(logs: IceCreamLog[]): WeekData[] {
  const now = new Date();
  const result: WeekData[] = [];

  for (let i = 11; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekLogs = logs.filter((log) => {
      const d = new Date(log.visited_at);
      return d >= weekStart && d <= weekEnd;
    });

    const flavoursSet = new Set<string>();
    const salonsSet = new Set<string>();
    weekLogs.forEach((log) => {
      (log.log_flavours ?? []).forEach((f) => {
        const name = f.flavour_name?.trim();
        if (name) flavoursSet.add(name);
      });
      const salon = log.salon_name?.trim();
      if (salon) salonsSet.add(salon);
    });

    result.push({
      weekLabel: `${weekStart.toLocaleString("en-US", { month: "short" })} ${weekStart.getDate()}`,
      logs: weekLogs.length,
      flavours: flavoursSet.size,
      salons: salonsSet.size,
    });
  }

  return result;
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
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("ice_cream_logs")
      .select(
        `id, salon_name, overall_rating, visited_at, price_paid, weather_condition,
         log_flavours (id, flavour_name, rating, rating_texture, rating_originality, rating_intensity, rating_presentation)`,
      )
      .eq("user_id", user.id),
    supabase
      .from("ice_cream_logs")
      .select(
        `id, user_id, salon_name, salon_lat, salon_lng, salon_place_id,
         overall_rating, notes, photo_url, visited_at, vessel, price_paid,
         weather_temp, weather_condition, visibility, photo_visibility,
         price_hidden_from_others,
         profiles (id, username, avatar_url),
         log_flavours (id, flavour_name, rating, tags, rating_texture, rating_originality, rating_intensity, rating_presentation)`,
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
  ]);

  const logs = (logsData ?? []) as IceCreamLog[];

  if (logsError) {
    // eslint-disable-next-line no-console
    console.error("Failed to load user ice cream logs:", logsError);
  }

  const feedLogs = (feedLogsData ?? []) as unknown as FeedIceCreamLog[];

  const {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    rankedFlavours,
    mostVisitedSalon,
    bestWeather,
    totalSpent,
    averagePerVisit,
  } = deriveStats(logs);

  const weeklyData = computeWeeklyData(logs);

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
    <main
      style={{ background: "var(--color-surface-alt)", minHeight: "100vh" }}
      className="px-4 pb-24 pt-6"
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-4">

        {/* ── Section 1: Profile Header ── */}
        <ProfileHeader
          displayName={displayName}
          initial={initial}
          avatarUrl={profile?.avatar_url ?? null}
          userId={user.id}
          username={profile?.username ?? ""}
          logCount={totalAllTime}
          followerCount={followerCount ?? 0}
          followingCount={followingCount ?? 0}
        />

        {/* ── Section 2: Activity Chart ── */}
        <ActivitySection weeklyData={weeklyData} />

        {/* ── Section 3: Quick Access Grid + sheets ── */}
        <ProfileGellogClient
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
          heatmapData={heatmapData}
        />

        {/* ── Section 4: Recent Logs ── */}
        <section>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
            className="mb-3"
          >
            Recent Logs
          </p>
          <ProfileFeedClient
            initialLogs={feedLogs}
            pageSize={FEED_PAGE_SIZE}
            currentUserId={user.id}
          />
        </section>

      </div>
    </main>
  );
}
