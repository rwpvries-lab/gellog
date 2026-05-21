'use client';

import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { PlaceholderScoop } from "@/src/components/Gelato/PlaceholderScoop";
import { createClient } from "@/src/lib/supabase/client";
import {
  applyResolvedFlavoursToLogRow,
  LOG_FLAVOURS_RESOLVED_SELECT,
} from "@/src/lib/log-flavours-resolved";
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
        salon_city,
        salon_lat,
        salon_lng,
        salon_place_id,
        overall_rating,
        notes,
        photo_url,
        visited_at,
        created_at,
        vessel,
        price_cents,
        weather_temp_c,
        weather_condition,
        weather_uv_index,
        visibility,
        photo_visibility,
        hide_price,
        profiles (
          id,
          username,
          avatar_url
        ),
${LOG_FLAVOURS_RESOLVED_SELECT}
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

    const newLogs = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) =>
      applyResolvedFlavoursToLogRow(row),
    ) as unknown as IceCreamLog[];
    setLogs((prev) => [...prev, ...newLogs]);
    setHasMore(newLogs.length === pageSize);
    setPage((prev) => prev + 1);
    setLoading(false);
  }

  if (logs.length === 0) {
    return (
      <div className="mt-2 flex flex-col items-center justify-center rounded-3xl border border-[color:var(--border-default)] bg-[color:var(--surface-elevated)] px-8 py-12 text-center shadow-[var(--shadow-card-sm)]">
        <PlaceholderScoop size={96} seed="profile-feed-empty" className="mb-4" />
        <p className="font-serif text-2xl font-medium text-[color:var(--text-primary)]">
          You haven&apos;t logged any gelato yet.
        </p>
        <Link
          href="/icecream/logs/new"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-[color:var(--text-inverse)] transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-2"
        >
          Log your first gelato →
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
          showOwnerActions
          onDelete={(id) => setLogs((prev) => prev.filter((l) => l.id !== id))}
        />
      ))}

      <div className="flex items-center justify-center py-2 text-xs text-[color:var(--color-text-secondary)]">
        {loading ? (
          <span>Loading more scoops…</span>
        ) : hasMore ? (
          <button
            type="button"
            onClick={() => void fetchMore()}
            className="rounded-full bg-[color:var(--color-surface)] px-4 py-1.5 text-xs font-semibold text-[color:var(--color-teal)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--color-teal)_35%,var(--color-border))] transition hover:brightness-95 dark:hover:brightness-110"
          >
            Load more
          </button>
        ) : (
          <span>All caught up.</span>
        )}
      </div>

      {error ? (
        <p className="pb-4 text-center text-xs text-[color:var(--color-error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
