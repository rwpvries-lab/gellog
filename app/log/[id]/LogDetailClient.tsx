'use client';

import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { createClient } from "@/src/lib/supabase/client";
import { notFound, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Avatar, CommentsSection, type LogComment } from "./CommentsSection";

type Props = {
  logId: string;
};

const LOG_SELECT = `
  id, user_id, salon_name, salon_lat, salon_lng, salon_place_id,
  overall_rating, notes, photo_url, visited_at, vessel, price_paid,
  weather_temp, weather_condition, weather_uv_index, visibility,
  photo_visibility, price_hidden_from_others,
  profiles ( id, username, avatar_url ),
  log_flavours (
    id, flavour_name, rating, tags,
    rating_texture, rating_originality, rating_intensity, rating_presentation
  )
`;

function LogDetailSkeleton() {
  return (
    <main
      className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40"
      style={{ paddingBottom: 120 }}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>

        <div className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="border-l-4 border-l-zinc-200 p-3 dark:border-l-zinc-700">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="mb-2 flex justify-between gap-3">
              <div className="h-5 flex-1 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-8 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="aspect-[8/5] w-full rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
            <div className="mt-3 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-6 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
          <div className="flex gap-3 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <div className="h-6 w-14 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-6 w-14 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>

        <section className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex animate-pulse gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-zinc-100 dark:bg-zinc-900/50 dark:ring-zinc-800"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex flex-1 flex-col gap-2 pt-0.5">
                <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

export function LogDetailClient({ logId }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "ready" | "notfound">("loading");
  const [log, setLog] = useState<IceCreamLog | null>(null);
  const [comments, setComments] = useState<LogComment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [currentProfile, setCurrentProfile] = useState<{
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [viewerFollowsAuthor, setViewerFollowsAuthor] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [mounted, setMounted] = useState(false);
  const [navHeight, setNavHeight] = useState(72);

  useEffect(() => {
    setPhase("loading");
    setLog(null);
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      const { data: logData, error } = await supabase
        .from("ice_cream_logs")
        .select(LOG_SELECT)
        .eq("id", logId)
        .single();

      if (cancelled) return;

      if (error || !logData) {
        setPhase("notfound");
        return;
      }

      const raw = logData as unknown as IceCreamLog;

      if (raw.visibility === "private" && raw.user_id !== user?.id) {
        setPhase("notfound");
        return;
      }

      if (raw.visibility === "friends") {
        if (!user) {
          setPhase("notfound");
          return;
        }
        if (raw.user_id !== user.id) {
          const { data: friendship } = await supabase
            .from("friendships")
            .select("following_id")
            .eq("follower_id", user.id)
            .eq("following_id", raw.user_id)
            .maybeSingle();
          if (!friendship) {
            setPhase("notfound");
            return;
          }
        }
      }

      const [
        { data: likesData },
        { data: userLikeData },
        { data: viewerFollowsData },
        { data: commentsData },
        { data: profileRow },
      ] = await Promise.all([
        supabase.from("log_likes").select("log_id").eq("log_id", logId),
        user
          ? supabase
              .from("log_likes")
              .select("log_id")
              .eq("log_id", logId)
              .eq("user_id", user.id)
          : Promise.resolve({ data: null }),
        user && raw.user_id !== user.id
          ? supabase
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
          .eq("log_id", logId)
          .order("created_at", { ascending: true }),
        user
          ? supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single()
          : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;

      const enrichedLog: IceCreamLog = {
        ...raw,
        like_count: (likesData ?? []).length,
        user_has_liked: (userLikeData ?? []).length > 0,
      };

      setLog(enrichedLog);
      setComments((commentsData ?? []) as unknown as LogComment[]);
      setCurrentUserId(user?.id);
      setCurrentProfile(profileRow ?? null);
      setViewerFollowsAuthor(viewerFollowsData != null);
      setPhase("ready");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [logId]);

  useEffect(() => {
    setMounted(true);
    const nav = document.querySelector("nav");
    if (!nav) return;
    const update = () => setNavHeight(nav.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;
    if (window.location.hash === "#comments") {
      setTimeout(() => {
        document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [phase]);

  function handleReply(username: string) {
    setInputValue(`@${username} `);
    inputRef.current?.focus();
  }

  async function handleSubmit() {
    if (!log) return;
    const content = inputValue.trim();
    if (!content || !currentUserId || submitting) return;
    setSubmitting(true);

    let parentId: string | null = null;
    const atMatch = content.match(/^@(\S+)\s/);
    if (atMatch) {
      const replyTo = atMatch[1];
      const parentComment = [...comments]
        .reverse()
        .find((c) => c.profiles?.username === replyTo);
      if (parentComment) {
        parentId = parentComment.parent_id ?? parentComment.id;
      }
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("log_comments")
      .insert({ log_id: log.id, user_id: currentUserId, content, parent_id: parentId })
      .select(
        "id, log_id, user_id, parent_id, content, created_at, updated_at, profiles ( username, avatar_url )",
      )
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as unknown as LogComment]);
      setInputValue("");
    }
    setSubmitting(false);
  }

  async function handleEdit(id: string, newContent: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("log_comments")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", currentUserId!);
    if (!error) {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, content: newContent } : c)),
      );
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("log_comments")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUserId!);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    }
  }

  const inputBarHeight = 64;
  const remaining = 500 - inputValue.length;

  const inputBar =
    phase === "ready" && log ? (
      <div
        className="border-t border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95"
        style={{ position: "fixed", bottom: navHeight, left: 0, right: 0, zIndex: 40 }}
      >
        <div className="mx-auto flex max-w-xl items-end gap-2">
          {currentUserId ? (
            <>
              <Avatar
                username={currentProfile?.username}
                avatarUrl={currentProfile?.avatar_url}
                size={30}
              />
              <div className="relative flex flex-1 items-end">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.slice(0, 500))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  placeholder="Add a comment…"
                  rows={1}
                  className="w-full resize-none rounded-2xl bg-zinc-100 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                  style={{ maxHeight: 120, overflowY: "auto" }}
                />
                {remaining <= 100 && (
                  <span
                    className={`absolute bottom-2.5 right-3 text-[10px] font-medium ${remaining < 0 ? "text-red-500" : "text-zinc-400"}`}
                  >
                    {remaining}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={!inputValue.trim() || submitting}
                onClick={() => void handleSubmit()}
                className="shrink-0 rounded-full bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:opacity-40"
              >
                {submitting ? "…" : "Post"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex flex-1 items-center justify-center rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              Sign in to comment
            </button>
          )}
        </div>
      </div>
    ) : null;

  if (phase === "notfound") {
    notFound();
  }

  if (phase === "loading" || !log) {
    return <LogDetailSkeleton />;
  }

  return (
    <>
      <main
        className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40"
        style={{ paddingBottom: navHeight + inputBarHeight + 16 }}
      >
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-100 transition hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800"
              aria-label="Go back"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Log</span>
          </div>

          <FeedCard
            log={log}
            currentUserId={currentUserId}
            viewerFollowsAuthor={viewerFollowsAuthor}
            isDetailPage
          />

          <section id="comments">
            <CommentsSection
              comments={comments}
              currentUserId={currentUserId}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </section>
        </div>
      </main>

      {mounted && inputBar ? createPortal(inputBar, document.body) : null}
    </>
  );
}
