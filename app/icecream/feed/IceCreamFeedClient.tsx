'use client';

import { createClient } from "@/src/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type LogFlavour = {
  id: string;
  flavour_name: string;
  rating: number | null;
};

type LogProfile = {
  id?: string;
  username: string | null;
  avatar_url: string | null;
};

export type IceCreamLog = {
  id: string;
  salon_name: string;
  overall_rating: number;
  notes: string | null;
  photo_url: string | null;
  visited_at: string;
  weather_temp: number | null;
  weather_condition: string | null;
  profiles: LogProfile[] | null;
  log_flavours: LogFlavour[];
};

type IceCreamFeedClientProps = {
  initialLogs: IceCreamLog[];
  pageSize: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/log-photos/${path}`;
}

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function formatWeather(log: IceCreamLog): string | null {
  const hasWeather =
    log.weather_temp != null || (log.weather_condition?.trim().length ?? 0) > 0;

  if (!hasWeather) return null;

  const tempNumber =
    typeof log.weather_temp === "number"
      ? log.weather_temp
      : log.weather_temp != null
        ? Number(log.weather_temp)
        : null;

  const tempPart =
    tempNumber != null && Number.isFinite(tempNumber)
      ? `${Math.round(tempNumber)}°C`
      : null;

  const conditionPart =
    log.weather_condition && log.weather_condition.trim().length > 0
      ? log.weather_condition.trim()
      : null;

  const pieces = [tempPart, conditionPart].filter(
    (piece): piece is string => Boolean(piece),
  );

  if (pieces.length === 0) return null;

  return pieces.join(" · ");
}

type RatingStarsProps = {
  value: number | null;
  size?: "sm" | "lg";
};

function RatingStars({ value, size = "sm" }: RatingStarsProps) {
  const safeValue = value ?? 0;
  const baseClass =
    size === "lg"
      ? "h-6 w-6 text-xl"
      : "h-4 w-4 text-base leading-none sm:h-5 sm:w-5 sm:text-lg";

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-white/80 px-2 py-1 text-orange-400 ring-1 ring-orange-100 dark:bg-zinc-900/70 dark:ring-zinc-700">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= safeValue;
        return (
          <span
            key={star}
            className={`${baseClass} ${
              active
                ? "text-orange-500 dark:text-orange-400"
                : "text-orange-200 dark:text-zinc-700"
            }`}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

export function IceCreamFeedClient({
  initialLogs,
  pageSize,
}: IceCreamFeedClientProps) {
  const [logs, setLogs] = useState<IceCreamLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialLogs.length === pageSize);
  const [page, setPage] = useState(1);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          void fetchMore();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, sentinelRef.current]);

  async function fetchMore(): Promise<void> {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error: fetchError } = await supabase
      .from("ice_cream_logs")
      .select(
        `
        id,
        salon_name,
        overall_rating,
        notes,
        photo_url,
        visited_at,
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
          rating
        )
      `,
      )
      .order("visited_at", { ascending: false })
      .range(from, to);

    if (fetchError) {
      setError("Could not load more logs. Please try again.");
      setLoading(false);
      return;
    }

    const newLogs = (data ?? []) as IceCreamLog[];

    setLogs((prev) => [...prev, ...newLogs]);
    setHasMore(newLogs.length === pageSize);
    setPage((prev) => prev + 1);
    setLoading(false);
  }

  const isEmpty = !loading && logs.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {logs.map((log) => {
        const profile = log.profiles?.[0];
        const displayName =
          profile?.username ??
          (profile?.id ? "Anonymous scoop" : "Someone");
        const timeAgo = formatTimeAgo(log.visited_at);
        const photoUrl = getPhotoUrl(log.photo_url);
        const weather = formatWeather(log);

        const ratingBorderClass =
          log.overall_rating >= 4
            ? "border-l-4 border-l-orange-400 dark:border-l-orange-500"
            : log.overall_rating >= 3
              ? "border-l-4 border-l-teal-500 dark:border-l-teal-400"
              : "border-l-4 border-l-zinc-200 dark:border-l-zinc-700";

        const numericFlavourRatings = log.log_flavours
          .map((flavour) =>
            typeof flavour.rating === "number" ? flavour.rating : null,
          )
          .filter((value): value is number => value != null);

        const highestFlavourRating =
          numericFlavourRatings.length > 0
            ? Math.max(...numericFlavourRatings)
            : null;

        return (
          <article
            key={log.id}
            className={`overflow-hidden rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-100 backdrop-blur-sm dark:bg-zinc-900 dark:ring-zinc-800 ${ratingBorderClass}`}
          >
            {photoUrl ? (
              <div className="relative aspect-[8/5] w-full overflow-hidden rounded-2xl">
                <Image
                  src={photoUrl}
                  alt={`Photo from ${log.salon_name}`}
                  width={800}
                  height={500}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {log.salon_name}
                  </h2>
                  {weather ? (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="mr-1">☀️</span>
                      {weather}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RatingStars value={log.overall_rating} size="lg" />
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {log.overall_rating.toFixed(1)}/5
                  </span>
                </div>
              </div>

              {log.log_flavours && log.log_flavours.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {log.log_flavours.map((flavour) => {
                    const isTopFlavour =
                      highestFlavourRating != null &&
                      typeof flavour.rating === "number" &&
                      flavour.rating === highestFlavourRating;

                    const flavourClass = isTopFlavour
                      ? "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-800/60"
                      : "bg-zinc-50 text-zinc-700 ring-zinc-100 dark:bg-zinc-900/70 dark:text-zinc-100 dark:ring-zinc-700";

                    return (
                      <div
                        key={flavour.id}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium shadow-sm ${flavourClass}`}
                      >
                        <span>{flavour.flavour_name}</span>
                        {flavour.rating != null ? (
                          <span className="flex items-center text-[10px] opacity-80">
                            <span className="mr-0.5">★</span>
                            {flavour.rating}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {log.notes ? (
                <p className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-100 dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-zinc-800">
                  {log.notes}
                </p>
              ) : null}

              <footer className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                    {displayName.charAt(0)?.toUpperCase() ?? "🍦"}
                  </div>
                  <span className="font-medium">{displayName}</span>
                </div>
                <span>{timeAgo}</span>
              </footer>
            </div>
          </article>
        );
      })}

      {isEmpty ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-12 text-center text-sm text-zinc-600 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800">
          <span className="mb-4 text-5xl">😋</span>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            No ice cream logs
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Start your first sweet adventure and track your scoops.
          </p>
          <Link
            href="/log"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-teal-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-300/50 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-white dark:shadow-none dark:focus:ring-offset-zinc-950"
          >
            Log a sweet trip
          </Link>
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-8 w-full" />

      <div className="flex items-center justify-center py-4 text-xs text-zinc-500 dark:text-zinc-400">
        {loading ? (
          <span>Loading more scoops…</span>
        ) : hasMore ? (
          <button
            type="button"
            onClick={() => void fetchMore()}
            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-teal-700 shadow-sm ring-1 ring-teal-100 transition hover:bg-teal-50 dark:bg-zinc-900 dark:text-teal-300 dark:ring-teal-900"
          >
            Load more
          </button>
        ) : logs.length > 0 ? (
          <span>You&apos;re all caught up.</span>
        ) : null}
      </div>

      {error ? (
        <p className="pb-4 text-center text-xs text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

