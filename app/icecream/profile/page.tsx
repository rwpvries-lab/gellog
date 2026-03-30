import { createClient } from "@/src/lib/supabase/server";
import type { IceCreamLog as FeedIceCreamLog } from "@/src/components/FeedCard";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IceCreamHeatmap, type HeatmapDayData } from "./IceCreamHeatmap";
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

function formatAverageRating(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)} ★`;
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

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconTrendingUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FEED_PAGE_SIZE = 10;

const GRID_CARDS = [
  { label: "Stats", href: "#stats-section", icon: <IconTrendingUp /> },
  { label: "Flavour ranking", href: "#ranking-section", icon: <IconTrophy /> },
  { label: "Passport", href: "/map", icon: <IconGlobe /> },
  { label: "Calendar", href: "#calendar-section", icon: <IconCalendar /> },
] as const;

const SECTION_LABEL_STYLE: React.CSSProperties = {
  color: "var(--color-text-secondary)",
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 600,
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 20,
};

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

        {/* ── Section 3: Quick Access Grid ── */}
        <section>
          <p style={SECTION_LABEL_STYLE} className="mb-3">
            Your Gellog
          </p>
          <div className="grid grid-cols-2 gap-3">
            {GRID_CARDS.map(({ label, href, icon }) => (
              <Link
                key={label}
                href={href}
                style={{
                  ...CARD_STYLE,
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <span style={{ color: "var(--color-orange)" }}>{icon}</span>
                <span
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Section 4: Recent Logs ── */}
        <section>
          <p style={SECTION_LABEL_STYLE} className="mb-3">
            Recent Logs
          </p>
          <ProfileFeedClient
            initialLogs={feedLogs}
            pageSize={FEED_PAGE_SIZE}
            currentUserId={user.id}
          />
        </section>

        {/* ── Stats details (linked from grid card) ── */}
        <section id="stats-section" aria-labelledby="stats-heading">
          <p id="stats-heading" style={SECTION_LABEL_STYLE} className="mb-3">
            Stats
          </p>
          <div style={CARD_STYLE} className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total scoops", value: String(totalAllTime) },
                { label: "This year", value: String(totalThisYear) },
                {
                  label: "Average rating",
                  value: formatAverageRating(averageOverallRating),
                },
                {
                  label: "Most visited salon",
                  value: mostVisitedSalon
                    ? `${mostVisitedSalon.name} (${mostVisitedSalon.count}×)`
                    : "—",
                },
                { label: "Best weather", value: bestWeather ?? "—" },
                totalSpent != null
                  ? {
                      label: "Total spent",
                      value: `€${totalSpent.toFixed(2)}`,
                    }
                  : null,
                averagePerVisit != null
                  ? {
                      label: "Avg per visit",
                      value: `€${averagePerVisit.toFixed(2)}`,
                    }
                  : null,
              ]
                .filter(Boolean)
                .map((stat) => (
                  <div key={stat!.label} className="flex flex-col gap-0.5">
                    <p
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      {stat!.label}
                    </p>
                    <p
                      style={{
                        color: "var(--color-text-primary)",
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                      className="truncate"
                    >
                      {stat!.value}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* ── Flavour ranking (linked from grid card) ── */}
        <section id="ranking-section" aria-labelledby="ranking-heading">
          <p id="ranking-heading" style={SECTION_LABEL_STYLE} className="mb-3">
            Flavour Ranking
          </p>
          <div style={CARD_STYLE} className="p-4">
            {rankedFlavours.length === 0 ? (
              <p
                style={{ color: "var(--color-text-secondary)", fontSize: 14 }}
              >
                Keep logging — flavours appear here once you've tried them at
                least twice.
              </p>
            ) : (
              <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
                {rankedFlavours.map((flavour) => (
                  <li
                    key={flavour.name}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ background: "var(--color-orange)" }}
                      >
                        #{flavour.rank}
                      </div>
                      <div className="flex flex-col">
                        <span
                          style={{
                            color: "var(--color-text-primary)",
                            fontSize: 14,
                            fontWeight: 500,
                          }}
                        >
                          {flavour.name}
                        </span>
                        <span
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: 12,
                          }}
                        >
                          {flavour.timesTried} scoop
                          {flavour.timesTried === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        color: "var(--color-orange)",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {flavour.averageRating.toFixed(1)} ★
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Activity heatmap / Calendar (linked from grid card) ── */}
        <section id="calendar-section" aria-labelledby="calendar-heading">
          <p id="calendar-heading" style={SECTION_LABEL_STYLE} className="mb-3">
            Calendar
          </p>
          <div style={CARD_STYLE} className="p-4">
            <IceCreamHeatmap data={heatmapData} />
          </div>
        </section>

      </div>
    </main>
  );
}
