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
  /** User IDs the current user follows (for friends-only photos). */
  initialFollowingUserIds?: string[];
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
  weather_uv_index,
  visibility,
  photo_visibility,
  price_hidden_from_others,
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
  initialFollowingUserIds = [],
}: IceCreamFeedClientProps) {
  const [tab, setTab] = useState<Tab>("everyone");
  const tabRef = useRef<Tab>("everyone");
  const followingIdsRef = useRef<string[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(
    () => new Set(initialFollowingUserIds),
  );

  const [logs, setLogs] = useState<IceCreamLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialLogs.length === pageSize);
  const [page, setPage] = useState(1);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setFollowingIds(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("friendships")
        .select("following_id")
        .eq("follower_id", currentUserId);
      if (cancelled) return;
      setFollowingIds(new Set((data ?? []).map((r) => r.following_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

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

  async function enrichWithLikes(rawLogs: IceCreamLog[]): Promise<IceCreamLog[]> {
    if (rawLogs.length === 0) return rawLogs;
    const supabase = createClient();
    const ids = rawLogs.map((l) => l.id);
    const [{ data: likesData }, { data: userLikesData }, { data: commentsData }] = await Promise.all([
      supabase.from("log_likes").select("log_id").in("log_id", ids),
      currentUserId
        ? supabase
            .from("log_likes")
            .select("log_id")
            .in("log_id", ids)
            .eq("user_id", currentUserId)
        : Promise.resolve({ data: null }),
      supabase.from("log_comments").select("log_id").in("log_id", ids),
    ]);
    const counts: Record<string, number> = {};
    for (const row of likesData ?? []) {
      counts[row.log_id] = (counts[row.log_id] ?? 0) + 1;
    }
    const liked = new Set((userLikesData ?? []).map((r: { log_id: string }) => r.log_id));
    const commentCounts: Record<string, number> = {};
    for (const row of commentsData ?? []) {
      commentCounts[row.log_id] = (commentCounts[row.log_id] ?? 0) + 1;
    }
    return rawLogs.map((l) => ({
      ...l,
      like_count: counts[l.id] ?? 0,
      user_has_liked: liked.has(l.id),
      comment_count: commentCounts[l.id] ?? 0,
    }));
  }

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

    const raw = (data ?? []) as unknown as IceCreamLog[];
    const newLogs = await enrichWithLikes(raw);

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
    setFollowingIds(new Set(ids));

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

    const raw = (data ?? []) as unknown as IceCreamLog[];
    const newLogs = await enrichWithLikes(raw);
    setLogs(newLogs);
    setPage(1);
    setHasMore(newLogs.length === pageSize);
    setLoading(false);
  }

  const isEmpty = !loading && logs.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 shadow-sm"
        role="tablist"
        aria-label="Feed scope"
      >
        {(["everyone", "friends"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => void switchTab(t)}
            className={`flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === t
                ? "bg-[color:var(--color-orange)] text-[color:var(--color-on-brand)] shadow-[0_1px_3px_color-mix(in_srgb,var(--color-text-primary)_12%,transparent)]"
                : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
            }`}
          >
            {t === "everyone" ? "Discover" : "Friends"}
          </button>
        ))}
      </div>

      {logs.map((log) => (
        <FeedCard
          key={log.id}
          log={log}
          currentUserId={currentUserId}
          viewerFollowsAuthor={followingIds.has(log.user_id)}
        />
      ))}

      {isEmpty && tab === "everyone" ? (
        <div className="relative mt-6 overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-8 py-12 text-center shadow-sm">
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[color:var(--color-orange-bg)] opacity-80 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-[color:var(--color-teal-bg)] opacity-90 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <div className="mb-6 flex items-end justify-center gap-0.5" aria-hidden>
              <span className="translate-y-1 text-4xl">🍨</span>
              <span className="text-6xl leading-none">🍦</span>
              <span className="translate-y-2 text-3xl">🧁</span>
            </div>
            <p className="text-base font-semibold text-[color:var(--color-text-primary)]">
              No scoops yet
            </p>
            <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
              Be the first to log a visit — your feed will fill up with flavour here.
            </p>
            <Link
              href="/log"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[color:var(--color-orange)] px-6 py-3 text-sm font-semibold text-[color:var(--color-on-brand)] shadow-[0_6px_20px_color-mix(in_srgb,var(--color-orange)_25%,transparent)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal)] focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)]"
            >
              Log your first scoop
            </Link>
          </div>
        </div>
      ) : isEmpty && tab === "friends" ? (
        <div className="relative mt-6 overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-8 py-12 text-center shadow-sm">
          <div
            className="pointer-events-none absolute -right-8 top-6 h-32 w-32 rounded-full bg-[color:var(--color-teal-bg)] opacity-75 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <div className="mb-6 flex items-center justify-center gap-2 text-5xl" aria-hidden>
              <span>👋</span>
              <span className="text-6xl leading-none">👥</span>
              <span className="text-4xl">🍦</span>
            </div>
            <p className="text-base font-semibold text-[color:var(--color-text-primary)]">
              No friend activity yet
            </p>
            <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
              Follow people you know to see their gelato logs in this tab.
            </p>
            <Link
              href="/search"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[color:var(--color-teal)] px-6 py-3 text-sm font-semibold text-[color:var(--color-on-brand)] shadow-[0_6px_20px_color-mix(in_srgb,var(--color-teal)_28%,transparent)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-orange)] focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)]"
            >
              Find people
            </Link>
          </div>
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-6 w-full" />

      <div className="flex items-center justify-center py-2 text-xs text-[color:var(--color-text-secondary)]">
        {loading ? (
          <span>Loading more scoops…</span>
        ) : hasMore ? (
          <button
            type="button"
            onClick={() => void fetchMore()}
            className="rounded-full bg-[color:var(--color-surface)] px-5 py-2 text-xs font-semibold text-[color:var(--color-teal)] shadow-sm ring-1 ring-[color:var(--color-border)] transition hover:bg-[color:var(--color-surface-alt)]"
          >
            Load more
          </button>
        ) : logs.length > 0 ? (
          <span>You&apos;re all caught up.</span>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="pb-4 text-center text-xs font-medium text-[color:var(--color-error)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
