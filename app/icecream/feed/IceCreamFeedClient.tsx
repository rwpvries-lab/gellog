'use client';

import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { createClient } from "@/src/lib/supabase/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type { IceCreamLog };

type Tab = "everyone" | "friends";

type IceCreamFeedClientProps = {
  initialLogs: IceCreamLog[];
  pageSize: number;
  currentUserId?: string;
};

const SELECT_FIELDS = `
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
  visibility,
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
`;

export function IceCreamFeedClient({
  initialLogs,
  pageSize,
  currentUserId,
}: IceCreamFeedClientProps) {
  const [tab, setTab] = useState<Tab>("everyone");
  const tabRef = useRef<Tab>("everyone");
  const followingIdsRef = useRef<string[]>([]);

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
  }, [hasMore, loading, tab, sentinelRef.current]);

  async function fetchMore(): Promise<void> {
    if (loading || !hasMore) return;

    const currentTab = tabRef.current;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("ice_cream_logs")
      .select(SELECT_FIELDS)
      .order("visited_at", { ascending: false })
      .range(from, to);

    if (currentTab === "everyone") {
      query = query.eq("visibility", "public");
    } else {
      const ids = followingIdsRef.current;
      if (ids.length === 0) {
        setHasMore(false);
        setLoading(false);
        return;
      }
      query = query.in("user_id", ids).in("visibility", ["public", "friends"]);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError("Could not load more logs. Please try again.");
      setLoading(false);
      return;
    }

    const newLogs = (data ?? []) as unknown as IceCreamLog[];

    setLogs((prev) => [...prev, ...newLogs]);
    setHasMore(newLogs.length === pageSize);
    setPage((prev) => prev + 1);
    setLoading(false);
  }

  async function switchTab(newTab: Tab) {
    if (newTab === tab) return;

    tabRef.current = newTab;
    setTab(newTab);

    if (newTab === "everyone") {
      setLogs(initialLogs);
      setPage(1);
      setHasMore(initialLogs.length === pageSize);
      return;
    }

    // Friends tab: fetch who the user follows, then load their logs
    setLogs([]);
    setPage(0);
    setHasMore(false);
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: friendships } = await supabase
      .from("friendships")
      .select("following_id")
      .eq("follower_id", currentUserId);

    const ids = (friendships ?? []).map((f) => f.following_id);
    followingIdsRef.current = ids;

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("ice_cream_logs")
      .select(SELECT_FIELDS)
      .in("user_id", ids)
      .in("visibility", ["public", "friends"])
      .order("visited_at", { ascending: false })
      .range(0, pageSize - 1);

    if (fetchError) {
      setError("Could not load logs. Please try again.");
      setLoading(false);
      return;
    }

    const newLogs = (data ?? []) as unknown as IceCreamLog[];
    setLogs(newLogs);
    setPage(1);
    setHasMore(newLogs.length === pageSize);
    setLoading(false);
  }

  const isEmpty = !loading && logs.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Tab toggle */}
      <div className="flex rounded-2xl bg-zinc-100 p-0.5 dark:bg-zinc-800">
        {(["everyone", "friends"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => void switchTab(t)}
            className={`flex flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t === "everyone" ? "Everyone" : "Friends"}
          </button>
        ))}
      </div>

      {logs.map((log) => (
        <FeedCard
          key={log.id}
          log={log}
          currentUserId={currentUserId}
          onDelete={(id) => setLogs((prev) => prev.filter((l) => l.id !== id))}
        />
      ))}

      {isEmpty && tab === "everyone" ? (
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
      ) : isEmpty && tab === "friends" ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-12 text-center text-sm text-zinc-600 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800">
          <span className="mb-4 text-5xl">👥</span>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            No logs from friends yet
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Follow people to see their scoops here.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-teal-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-300/50 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-white dark:shadow-none dark:focus:ring-offset-zinc-950"
          >
            Find people to follow
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
