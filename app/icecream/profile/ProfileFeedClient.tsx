'use client';

import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { createClient } from "@/src/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

type ProfileFeedClientProps = {
  initialLogs: IceCreamLog[];
  pageSize: number;
  currentUserId: string;
};

export function ProfileFeedClient({
  initialLogs,
  pageSize,
  currentUserId,
}: ProfileFeedClientProps) {
  const [logs, setLogs] = useState<IceCreamLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialLogs.length === pageSize);
  const [page, setPage] = useState(1);

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
      .eq("user_id", currentUserId)
      .order("visited_at", { ascending: false })
      .range(from, to);

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

  if (logs.length === 0) {
    return (
      <div className="mt-2 flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <span className="mb-4 text-5xl">🍦</span>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          No logs yet
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Track your first gelato adventure.
        </p>
        <Link
          href="/log"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-teal-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-300/50 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-white dark:shadow-none dark:focus:ring-offset-zinc-950"
        >
          Log your first gelato
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {logs.map((log) => (
        <FeedCard
          key={log.id}
          log={log}
          currentUserId={currentUserId}
          onDelete={(id) => setLogs((prev) => prev.filter((l) => l.id !== id))}
        />
      ))}

      <div className="flex items-center justify-center py-2 text-xs text-zinc-500 dark:text-zinc-400">
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
        ) : (
          <span>All caught up.</span>
        )}
      </div>

      {error ? (
        <p className="pb-4 text-center text-xs text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
