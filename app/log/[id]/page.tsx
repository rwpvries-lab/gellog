import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import { LogDetailClient } from "./LogDetailClient";
import type { IceCreamLog } from "@/src/components/FeedCard";
import type { LogComment } from "./CommentsSection";

type Params = { id: string };

export default async function LogDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: logData, error } = await supabase
    .from("ice_cream_logs")
    .select(
      `
      id, user_id, salon_name, salon_lat, salon_lng, salon_place_id,
      overall_rating, notes, photo_url, visited_at, vessel, price_paid,
      weather_temp, weather_condition, weather_uv_index, visibility,
      photo_visibility, price_hidden_from_others,
      profiles ( id, username, avatar_url ),
      log_flavours (
        id, flavour_name, rating, tags,
        rating_texture, rating_originality, rating_intensity, rating_presentation
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !logData) notFound();

  const log = logData as unknown as IceCreamLog;

  // Visibility gate
  if (log.visibility === "private" && log.user_id !== user?.id) notFound();
  if (log.visibility === "friends") {
    if (!user) notFound();
    if (log.user_id !== user.id) {
      const { data: friendship } = await supabase
        .from("friendships")
        .select("following_id")
        .eq("follower_id", user.id)
        .eq("following_id", log.user_id)
        .maybeSingle();
      if (!friendship) notFound();
    }
  }

  const [
    { data: likesData },
    { data: userLikeData },
    { data: viewerFollowsData },
    { data: commentsData },
    { data: currentProfile },
  ] = await Promise.all([
    supabase.from("log_likes").select("log_id").eq("log_id", id),
    user
      ? supabase
          .from("log_likes")
          .select("log_id")
          .eq("log_id", id)
          .eq("user_id", user.id)
      : Promise.resolve({ data: null }),
    user && log.user_id !== user.id
      ? supabase
          .from("friendships")
          .select("following_id")
          .eq("follower_id", user.id)
          .eq("following_id", log.user_id)
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
      ? supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const enrichedLog: IceCreamLog = {
    ...(log as unknown as IceCreamLog),
    like_count: (likesData ?? []).length,
    user_has_liked: (userLikeData ?? []).length > 0,
  };

  return (
    <LogDetailClient
      log={enrichedLog}
      initialComments={(commentsData ?? []) as unknown as LogComment[]}
      currentUserId={user?.id}
      currentProfile={currentProfile ?? null}
      viewerFollowsAuthor={viewerFollowsData != null}
    />
  );
}
