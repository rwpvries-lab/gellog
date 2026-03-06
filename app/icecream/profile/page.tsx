import { LogoutButton } from "@/app/components/LogoutButton";
import { createClient } from "@/src/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

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
};

type IceCreamLog = {
  id: string;
  salon_name: string;
  overall_rating: number;
  visited_at: string;
  weather_condition: string | null;
  log_flavours: LogFlavour[];
};

type FlavourStats = {
  name: string;
  timesTried: number;
  ratingCount: number;
  ratingSum: number;
};

type RankedFlavour = {
  rank: number;
  name: string;
  timesTried: number;
  averageRating: number;
};

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

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
        };

      existing.timesTried += 1;
      if (flavour.rating != null) {
        existing.ratingCount += 1;
        existing.ratingSum += flavour.rating;
      }

      flavourMap.set(key, existing);
    });
  });

  const allFlavourStats = Array.from(flavourMap.values()).map((stat) => ({
    ...stat,
    averageRating:
      stat.ratingCount > 0 ? stat.ratingSum / stat.ratingCount : null,
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

  const recentLogs = [...logs]
    .sort(
      (a, b) =>
        new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime(),
    )
    .slice(0, 6);

  return {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    favouriteFlavour,
    rankedFlavours,
    mostVisitedSalon,
    bestWeather,
    recentLogs,
  };
}

function getTopFlavourForLog(log: IceCreamLog): LogFlavour | null {
  const flavours = log.log_flavours ?? [];
  if (flavours.length === 0) return null;

  const withRating = flavours.filter((flavour) => flavour.rating != null);
  const source = withRating.length > 0 ? withRating : flavours;

  return [...source].sort((a, b) => {
    const aRating = a.rating ?? 0;
    const bRating = b.rating ?? 0;
    if (bRating !== aRating) return bRating - aRating;
    return a.flavour_name.localeCompare(b.flavour_name);
  })[0];
}

export default async function IceCreamProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/icecream/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .single<Profile>();

  const { data: logsData, error: logsError } = await supabase
    .from("ice_cream_logs")
    .select(
      `
        id,
        salon_name,
        overall_rating,
        visited_at,
        weather_condition,
        log_flavours (
          id,
          flavour_name,
          rating
        )
      `,
    )
    .eq("user_id", user.id);

  const logs = (logsData ?? []) as IceCreamLog[];

  if (logsError) {
    // eslint-disable-next-line no-console
    console.error("Failed to load user ice cream logs:", logsError);
  }

  const {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    favouriteFlavour,
    rankedFlavours,
    mostVisitedSalon,
    bestWeather,
    recentLogs,
  } = deriveStats(logs);

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
              <button
                type="button"
                className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-orange-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
              >
                Edit profile
              </button>
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

          <section aria-labelledby="recent-logs-heading">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2
                id="recent-logs-heading"
                className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
              >
                Recent logs
              </h2>
              {logs.length > 0 ? (
                <Link
                  href="/icecream/feed"
                  className="text-xs font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                >
                  View full feed
                </Link>
              ) : null}
            </div>
            <div className="rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-orange-100 dark:bg-zinc-900/90 dark:ring-zinc-800">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  No logs yet – log a scoop to see your history here.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentLogs.map((log) => {
                    const topFlavour = getTopFlavourForLog(log);

                    return (
                      <li
                        key={log.id}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {log.salon_name}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {topFlavour ? topFlavour.flavour_name : "No flavours"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-500 ring-1 ring-orange-100 dark:bg-zinc-900 dark:text-orange-300 dark:ring-zinc-700">
                            {log.overall_rating.toFixed(1)} ★
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDate(log.visited_at)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
  );
}

