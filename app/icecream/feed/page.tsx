import { AppShell } from "@/app/components/AppShell";
import { GellogLogo } from "@/app/components/GellogLogo";
import { NotifPromptBanner } from "@/app/components/NotifPromptBanner";
import { createClient } from "@/src/lib/supabase/server";
import type { IceCreamLog } from "@/src/components/FeedCard";
import { Bell } from "lucide-react";
import Link from "next/link";
import { IceCreamFeedClient } from "./IceCreamFeedClient";

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
      salon_city,
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
    <AppShell variant="wash" className="pt-4">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="min-w-0" aria-hidden />
          <Link
            href="/icecream/feed"
            className="flex justify-center"
            aria-label="Gellog feed home"
          >
            <GellogLogo size={40} priority />
          </Link>
          <div className="flex min-w-0 justify-end">
            <Link
              href="/settings"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-teal)]"
              aria-label="Notification settings"
            >
              <Bell className="h-[1.35rem] w-[1.35rem]" strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </header>

        {(logCount ?? 0) >= 3 && <NotifPromptBanner />}

        <IceCreamFeedClient
          initialLogs={logs}
          pageSize={PAGE_SIZE}
          currentUserId={user?.id}
          initialFollowingUserIds={initialFollowingUserIds}
        />
    </AppShell>
  );
}

