'use client';

import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { createClient } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Avatar, CommentsSection, type LogComment } from "./CommentsSection";

type Props = {
  log: IceCreamLog;
  initialComments: LogComment[];
  currentUserId?: string;
  currentProfile: { username: string | null; avatar_url: string | null } | null;
  viewerFollowsAuthor?: boolean;
};

export function LogDetailClient({
  log,
  initialComments,
  currentUserId,
  currentProfile,
  viewerFollowsAuthor,
}: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<LogComment[]>(initialComments);
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Portal support: only render after mount (no SSR), measure actual nav height
  const [mounted, setMounted] = useState(false);
  const [navHeight, setNavHeight] = useState(72);

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
    if (window.location.hash === "#comments") {
      setTimeout(() => {
        document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);

  function handleReply(username: string) {
    setInputValue(`@${username} `);
    inputRef.current?.focus();
  }

  async function handleSubmit() {
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

  const remaining = 500 - inputValue.length;

  // Input bar height ≈ 58px (py-3 × 2 + textarea row). Add breathing room.
  const inputBarHeight = 64;

  const inputBar = (
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
  );

  return (
    <>
      <main
        className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40"
        style={{ paddingBottom: navHeight + inputBarHeight + 16 }}
      >
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          {/* Back button */}
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

      {/* Portal: renders at document.body level, fixed right above the BottomNav */}
      {mounted && createPortal(inputBar, document.body)}
    </>
  );
}
