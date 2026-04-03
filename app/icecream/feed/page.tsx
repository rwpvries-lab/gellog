import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { IceCreamFeedClient } from "./IceCreamFeedClient";
import { NotifPromptBanner } from "@/app/components/NotifPromptBanner";
import type { IceCreamLog } from "@/src/components/FeedCard";

export const revalidate = 30;

const PAGE_SIZE = 10;

export default async function IceCreamFeedPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const followingQuery =
    user != null
      ? supabase
          .from("friendships")
          .select("following_id")
          .eq("follower_id", user.id)
      : Promise.resolve({ data: null as { following_id: string }[] | null });

  const logCountQuery =
    user != null
      ? supabase
          .from("ice_cream_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
      : Promise.resolve({ count: 0 as number | null });

  const [{ data, error }, { data: followingRows }, { count: logCount }] = await Promise.all([
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
    `,
    )
    .eq("visibility", "public")
    .order("visited_at", { ascending: false })
    .limit(PAGE_SIZE),
    followingQuery,
    logCountQuery,
  ]);

  const rawLogs = (data ?? []) as unknown as IceCreamLog[];
  const initialFollowingUserIds = (followingRows ?? []).map((r) => r.following_id);

  // Fetch like counts + user's own likes for the fetched log ids
  const logIds = rawLogs.map((l) => l.id);
  let likeCounts: Record<string, number> = {};
  let likedIds = new Set<string>();
  let commentCounts: Record<string, number> = {};

  if (logIds.length > 0) {
    const [{ data: likesData }, { data: userLikesData }, { data: commentsData }] = await Promise.all([
      supabase
        .from("log_likes")
        .select("log_id")
        .in("log_id", logIds),
      user
        ? supabase
            .from("log_likes")
            .select("log_id")
            .in("log_id", logIds)
            .eq("user_id", user.id)
        : Promise.resolve({ data: null }),
      supabase
        .from("log_comments")
        .select("log_id")
        .in("log_id", logIds),
    ]);
    for (const row of likesData ?? []) {
      likeCounts[row.log_id] = (likeCounts[row.log_id] ?? 0) + 1;
    }
    likedIds = new Set((userLikesData ?? []).map((r) => r.log_id));
    for (const row of commentsData ?? []) {
      commentCounts[row.log_id] = (commentCounts[row.log_id] ?? 0) + 1;
    }
  }

  const logs: IceCreamLog[] = rawLogs.map((l) => ({
    ...l,
    like_count: likeCounts[l.id] ?? 0,
    user_has_liked: likedIds.has(l.id),
    comment_count: commentCounts[l.id] ?? 0,
  }));

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load ice cream logs:", error);
  }

  return (
    <main className="min-h-screen bg-[color:var(--color-surface-alt)] px-4 pb-24 pt-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text-primary)]">
              Ice cream feed
            </h1>
            <p className="text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
              Latest scoops from the community.
            </p>
          </div>
        </header>

        {(logCount ?? 0) >= 3 && <NotifPromptBanner />}

        <IceCreamFeedClient
          initialLogs={logs}
          pageSize={PAGE_SIZE}
          currentUserId={user?.id}
          initialFollowingUserIds={initialFollowingUserIds}
        />
      </div>

      <Link
        href="/icecream/logs/new"
        className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-orange),var(--color-teal))] text-3xl font-semibold text-[color:var(--color-on-brand)] shadow-[0_10px_28px_color-mix(in_srgb,var(--color-orange)_28%,transparent)] ring-2 ring-[color:var(--color-surface)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--color-teal)_45%,transparent)]"
        aria-label="Log a new ice cream"
      >
        +
      </Link>
    </main>
  );
}

