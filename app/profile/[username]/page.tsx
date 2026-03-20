import { createClient } from "@/src/lib/supabase/server";
import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { FollowListSheet } from "@/app/components/FollowListSheet";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "./FollowButton";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

const FEED_FIELDS = `
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

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .single<Profile>();

  if (!profile) {
    notFound();
  }

  const isOwnProfile = user?.id === profile.id;

  const [
    { count: followerCount },
    { count: followingCount },
    { data: logsData },
    { count: isFollowingCount },
  ] = await Promise.all([
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    supabase
      .from("ice_cream_logs")
      .select(FEED_FIELDS)
      .eq("user_id", profile.id)
      .eq("visibility", "public")
      .order("visited_at", { ascending: false })
      .limit(5),
    user && !isOwnProfile
      ? supabase
          .from("friendships")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
      : Promise.resolve({ count: 0, data: null, error: null }),
  ]);

  const logs = (logsData ?? []) as unknown as IceCreamLog[];
  const isFollowing = (isFollowingCount ?? 0) > 0;

  const displayName =
    profile.display_name?.trim() || profile.username?.trim() || "Ice cream lover";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pb-24 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <Link
            href="/icecream/feed"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Back"
          >
            ←
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Profile
          </h1>
        </header>

        {/* Profile card */}
        <div className="flex items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500 text-white shadow-md ring-2 ring-white/80 dark:ring-zinc-900">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-semibold">
                  {initial}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {displayName}
              </p>
              {profile.username ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  @{profile.username}
                </p>
              ) : null}

              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <FollowListSheet
                  userId={profile.id}
                  type="followers"
                  count={followerCount ?? 0}
                  currentUserId={user?.id}
                />
                <FollowListSheet
                  userId={profile.id}
                  type="following"
                  count={followingCount ?? 0}
                  currentUserId={user?.id}
                />
              </div>
            </div>
          </div>

          {isOwnProfile ? (
            <Link
              href="/settings"
              className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Edit profile
            </Link>
          ) : user ? (
            <FollowButton
              currentUserId={user.id}
              targetUserId={profile.id}
              initialIsFollowing={isFollowing}
            />
          ) : null}
        </div>

        {/* Stats pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60">
            <span>🍦</span>
            {logs.length === 5 ? "5+ recent public scoops" : `${logs.length} public scoop${logs.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Recent public logs */}
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
            <span className="mb-4 text-5xl">😋</span>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              No public logs yet
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {displayName} hasn&apos;t shared any scoops publicly.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {logs.map((log) => (
              <FeedCard
                key={log.id}
                log={log}
                currentUserId={user?.id}
                viewerFollowsAuthor={isOwnProfile || isFollowing}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
