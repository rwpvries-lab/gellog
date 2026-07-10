import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import type { IceCreamLog } from "@/src/components/FeedCard";
import { resolveLogAccess } from "./logAccess";
import { LogDetailClient } from "./LogDetailClient";
import type { LogComment } from "./CommentsSection";

type Params = { id: string };

export default async function LogDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await resolveLogAccess(supabase, id, user ? { id: user.id } : null);
  if (access.status === "not_found") {
    notFound();
  }

  const { log: raw, friendshipWithAuthor } = access;

  const [
    { data: likesData },
    { data: userLikeData },
    { data: viewerFollowsData },
    { data: commentsData },
    { data: profileRow },
  ] = await Promise.all([
    supabase.from("log_likes").select("log_id").eq("log_id", id),
    user
      ? supabase.from("log_likes").select("log_id").eq("log_id", id).eq("user_id", user.id)
      : Promise.resolve({ data: null }),
    user && raw.user_id !== user.id
      ? friendshipWithAuthor
        ? Promise.resolve({ data: friendshipWithAuthor })
        : supabase
            .from("friendships")
            .select("following_id")
            .eq("follower_id", user.id)
            .eq("following_id", raw.user_id)
            .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("log_comments")
      .select(
        "id, log_id, user_id, parent_id, content, created_at, updated_at, profiles ( username, avatar_url )",
      )
      .eq("log_id", id)
      .order("created_at", { ascending: true }),
    user
      ? supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const log: IceCreamLog = {
    ...raw,
    like_count: (likesData ?? []).length,
    user_has_liked: (userLikeData ?? []).length > 0,
  };

  return (
    <LogDetailClient
      log={log}
      initialComments={(commentsData ?? []) as unknown as LogComment[]}
      currentUserId={user?.id}
      currentProfile={profileRow ?? null}
      viewerFollowsAuthor={viewerFollowsData != null}
    />
  );
}
