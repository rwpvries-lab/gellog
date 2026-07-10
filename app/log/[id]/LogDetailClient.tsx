'use client';

import { AppShell } from "@/app/components/AppShell";
import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { createClient } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { PublicBanner, PUBLIC_BANNER_LAYOUT_PX } from "@/src/components/PublicBanner";
import { Avatar, CommentsSection, type LogComment } from "./CommentsSection";

type Props = {
  log: IceCreamLog;
  initialComments: LogComment[];
  currentUserId?: string;
  currentProfile: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  viewerFollowsAuthor: boolean;
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

  const [mounted, setMounted] = useState(false);
  const [navHeight, setNavHeight] = useState(72);

  useEffect(() => {
    const mountedId = requestAnimationFrame(() => setMounted(true));
    const nav = document.querySelector("nav");
    if (!nav) {
      requestAnimationFrame(() => setNavHeight(0));
      return () => cancelAnimationFrame(mountedId);
    }
    const update = () => {
      const nextHeight = nav.getBoundingClientRect().height;
      requestAnimationFrame(() => setNavHeight(nextHeight));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => {
      cancelAnimationFrame(mountedId);
      ro.disconnect();
    };
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

  const inputBarHeight = 64;
  const remaining = 500 - inputValue.length;
  const commentBarBottomOffset = currentUserId ? navHeight : PUBLIC_BANNER_LAYOUT_PX;

  const inputBar = (
    <div
      className="border-t border-[color:var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)]"
      style={{
        position: "fixed",
        bottom: commentBarBottomOffset,
        left: 0,
        right: 0,
        zIndex: 40,
      }}
    >
      <div className="mx-auto flex max-w-xl items-end gap-2">
        {currentUserId ? (
          <>
            <Avatar
              username={currentProfile?.username}
              avatarUrl={currentProfile?.avatar_url}
              size={40}
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
                className="w-full resize-none rounded-2xl bg-[color:var(--color-surface-alt)] px-3.5 py-2.5 pr-10 text-sm text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
                style={{ maxHeight: 120, overflowY: "auto" }}
              />
              {remaining <= 100 && (
                <span
                  className={`absolute bottom-2.5 right-3 text-[10px] font-medium ${remaining < 0 ? "text-[color:var(--color-error)]" : "text-[color:var(--color-text-tertiary)]"}`}
                >
                  {remaining}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={!inputValue.trim() || submitting}
              onClick={() => void handleSubmit()}
              className="shrink-0 rounded-full bg-[color:var(--color-orange)] px-4 py-2.5 text-xs font-semibold text-[color:var(--color-on-brand)] transition hover:brightness-110 disabled:opacity-40"
            >
              {submitting ? "…" : "Post"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex flex-1 items-center justify-center rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700 px-4 py-2.5 text-sm text-[color:var(--color-text-secondary)] ring-1 ring-[color:var(--color-border)]"
          >
            Sign in to comment
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <AppShell
        mainStyle={{
          paddingBottom: commentBarBottomOffset + inputBarHeight + 16,
        }}
      >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-surface)] text-[color:var(--color-text-secondary)] shadow-[var(--shadow-float)] ring-1 ring-[color:var(--color-border)] transition hover:brightness-95 dark:hover:brightness-110"
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
            <span className="text-sm font-semibold text-[color:var(--color-text-primary)]">Log</span>
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
      </AppShell>

      {mounted ? createPortal(inputBar, document.body) : null}
      {mounted && !currentUserId ? createPortal(<PublicBanner variant="log" />, document.body) : null}
    </>
  );
}
