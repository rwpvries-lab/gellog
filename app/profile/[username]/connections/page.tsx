import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import { ConnectionsClient, type PersonProfile } from "./ConnectionsClient";

type FollowerRow = {
  profiles: PersonProfile | PersonProfile[] | null;
};

function extractProfile(row: FollowerRow): PersonProfile | null {
  const p = row.profiles;
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const initialTab: "followers" | "following" =
    tab === "following" ? "following" : "followers";

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

  const viewedUserId = profile.id;

  const [followersRes, followingRes, myFollowingRes, myFollowersRes] =
    await Promise.all([
      supabase
        .from("friendships")
        .select("profiles!follower_id(id, username, display_name, avatar_url)")
        .eq("following_id", viewedUserId),
      supabase
        .from("friendships")
        .select("profiles!following_id(id, username, display_name, avatar_url)")
        .eq("follower_id", viewedUserId),
      user
        ? supabase
            .from("friendships")
            .select("following_id")
            .eq("follower_id", user.id)
        : Promise.resolve({ data: [] as { following_id: string }[], error: null }),
      user
        ? supabase
            .from("friendships")
            .select("follower_id")
            .eq("following_id", user.id)
        : Promise.resolve({ data: [] as { follower_id: string }[], error: null }),
    ]);

  const followers: PersonProfile[] = (followersRes.data ?? [])
    .map((r) => extractProfile(r as FollowerRow))
    .filter((p): p is PersonProfile => p !== null);

  const following: PersonProfile[] = (followingRes.data ?? [])
    .map((r) => extractProfile(r as FollowerRow))
    .filter((p): p is PersonProfile => p !== null);

  const myFollowingIds = (myFollowingRes.data ?? []).map((r) => r.following_id);
  const myFollowerIds = (myFollowersRes.data ?? []).map((r) => r.follower_id);

  return (
    <ConnectionsClient
      viewedUsername={username}
      followers={followers}
      following={following}
      currentUserId={user?.id ?? null}
      myFollowingIds={myFollowingIds}
      myFollowerIds={myFollowerIds}
      initialTab={initialTab}
    />
  );
}
