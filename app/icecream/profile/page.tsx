import { LogoutButton } from "@/app/components/LogoutButton";
import { createClient } from "@/src/lib/supabase/server";
import type { IceCreamLog as FeedIceCreamLog } from "@/src/components/FeedCard";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IceCreamHeatmap, type HeatmapDayData } from "./IceCreamHeatmap";
import { ProfileFeedClient } from "./ProfileFeedClient";

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

      const existing =
        flavourMap.get(key) ?? {
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
    averageRating: stat.ratingCount > 0 ? stat.ratingSum / stat.ratingCount : null,
  }));

  const favouriteFlavour =
    allFlavourStats.length > 0
      ? [...allFlavourStats].sort((a, b) => {
          if (b.timesTried !== a.timesTried) {
            return b.timesTried - a.timesTried;
          }

          const aAvg = a.averageRating ?? 0;
          const bAvg = b.averageRating ?? 0;
          return bAvg - aAvg;
        })[0]
      : null;

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
      avgTexture: stat.textureCount > 0 ? stat.textureSum / stat.textureCount : null,
      avgOriginality: stat.originalityCount > 0 ? stat.originalitySum / stat.originalityCount : null,
      avgIntensity: stat.intensityCount > 0 ? stat.intensitySum / stat.intensityCount : null,
      avgPresentation: stat.presentationCount > 0 ? stat.presentationSum / stat.presentationCount : null,
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
      const lastVisited =
        visited > existing.lastVisited ? visited : existing.lastVisited;
      salonMap.set(key, {
        name: existing.name,
        count: existing.count + 1,
        lastVisited,
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

    const existing = weatherCounts.get(condition) ?? 0;
    weatherCounts.set(condition, existing + 1);
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
    favouriteFlavour,
    rankedFlavours,
    mostVisitedSalon,
    bestWeather,
    totalSpent,
    averagePerVisit,
  };
}

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
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("ice_cream_logs")
      .select(
        `
          id,
          salon_name,
          overall_rating,
          visited_at,
          price_paid,
          weather_condition,
          log_flavours (
            id,
            flavour_name,
            rating,
            rating_texture,
            rating_originality,
            rating_intensity,
            rating_presentation
          )
        `,
      )
      .eq("user_id", user.id),
    supabase
      .from("ice_cream_logs")
      .select(
        `
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
          vessel,
          price_paid,
          weather_temp,
          weather_condition,
          profiles (
            id,
            username,
            avatar_url
          ),
          log_flavours (
            id,
            flavour_name,
            rating,
            tags,
            rating_texture,
            rating_originality,
            rating_intensity,
            rating_presentation
          )
        `,
      )
      .eq("user_id", user.id)
      .order("visited_at", { ascending: false })
      .limit(FEED_PAGE_SIZE),
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
    favouriteFlavour,
    rankedFlavours,
    mostVisitedSalon,
    bestWeather,
    totalSpent,
    averagePerVisit,
  } = deriveStats(logs);

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
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pb-24 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 pb-4">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500 text-white shadow-md ring-2 ring-white/80 dark:ring-zinc-900">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-semibold">
                    {initial}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Personal stats
                </span>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {displayName}
                </h1>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Link
                href="/settings"
                className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-orange-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
              >
                ⚙️ Settings
              </Link>
              <LogoutButton />
            </div>
          </header>

          <section aria-labelledby="profile-stats-heading">
            <div className="flex items-baseline justify-between gap-2">
              <h2
                id="profile-stats-heading"
                className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
              >
                Stats
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                All-time scoops
              </span>
            </div>

            <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
              <div className="min-w-[150px] snap-start rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Total scoops
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {totalAllTime}
                </p>
              </div>

              <div className="min-w-[150px] snap-start rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  This year
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {totalThisYear}
                </p>
              </div>

              <div className="min-w-[170px] snap-start rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Favourite flavour
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {favouriteFlavour ? favouriteFlavour.name : "Not enough data"}
                </p>
                {favouriteFlavour ? (
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {favouriteFlavour.timesTried} scoop
                    {favouriteFlavour.timesTried === 1 ? "" : "s"} ·{" "}
                    {formatAverageRating(
                      favouriteFlavour.averageRating ?? null,
                    )}
                  </p>
                ) : null}
              </div>

              <div className="min-w-[170px] snap-start rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Most visited salon
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {mostVisitedSalon ? mostVisitedSalon.name : "Not yet"}
                </p>
                {mostVisitedSalon ? (
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {mostVisitedSalon.count} visit
                    {mostVisitedSalon.count === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>

              <div className="min-w-[150px] snap-start rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Average rating
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatAverageRating(averageOverallRating)}
                </p>
              </div>

              <div className="min-w-[180px] snap-start rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Best weather
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {bestWeather ?? "Not enough data"}
                </p>
              </div>

              {totalSpent != null ? (
                <div className="min-w-[150px] snap-start rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Total spent
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    €{totalSpent.toFixed(2)}
                  </p>
                </div>
              ) : null}

              {averagePerVisit != null ? (
                <div className="min-w-[160px] snap-start rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Average per visit
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    €{averagePerVisit.toFixed(2)}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="activity-heatmap-heading">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2
                id="activity-heatmap-heading"
                className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
              >
                Activity
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Last 12 months
              </span>
            </div>
            <div className="rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
              <IceCreamHeatmap data={heatmapData} />
            </div>
          </section>

          <section aria-labelledby="flavour-ranking-heading">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2
                id="flavour-ranking-heading"
                className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
              >
                All-time flavour ranking
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Min. 2 scoops to rank
              </span>
            </div>
            <div className="rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
              {rankedFlavours.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Keep logging – flavours appear here once you have tried them
                  at least twice.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {rankedFlavours.map((flavour) => (
                    <li
                      key={flavour.name}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-teal-500 text-xs font-semibold text-white shadow-sm">
                          #{flavour.rank}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {flavour.name}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {flavour.timesTried} scoop
                            {flavour.timesTried === 1 ? "" : "s"}
                          </span>
                          {(flavour.avgTexture != null || flavour.avgOriginality != null || flavour.avgIntensity != null || flavour.avgPresentation != null) ? (
                            <span className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                              {[
                                flavour.avgTexture != null && `Textuur: ${flavour.avgTexture.toFixed(1)}`,
                                flavour.avgOriginality != null && `Originaliteit: ${flavour.avgOriginality.toFixed(1)}`,
                                flavour.avgIntensity != null && `Intensiteit: ${flavour.avgIntensity.toFixed(1)}`,
                                flavour.avgPresentation != null && `Presentatie: ${flavour.avgPresentation.toFixed(1)}`,
                              ].filter(Boolean).join(" · ")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-orange-500 dark:text-orange-300">
                        {flavour.averageRating.toFixed(1)} ★
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-labelledby="your-logs-heading">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2
                id="your-logs-heading"
                className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
              >
                Your logs
              </h2>
            </div>
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

