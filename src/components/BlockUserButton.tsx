"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Toast, useToast } from "@/src/components/Toast";

/**
 * Block control on another user's profile (Apple Guideline 1.2). Confirms, then
 * writes a `blocked_users` row (RLS: manage-own) and notifies support via
 * `/api/report-content`. After blocking we route to the feed and refresh so the
 * blocked author's logs disappear from the viewer's feed immediately.
 */
export function BlockUserButton({
  blockerId,
  blockedId,
  username,
}: {
  blockerId: string;
  blockedId: string;
  username: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  const handle = username?.trim() ? `@${username.trim()}` : "this user";

  async function handleBlock() {
    if (submitting) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    setSubmitting(false);

    // Unique constraint violation (already blocked) is a no-op success.
    if (error && error.code !== "23505") {
      showToast("Couldn't block user. Please try again.");
      return;
    }

    setConfirming(false);
    void fetch("/api/report-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "block", blockedUserId: blockedId }),
    }).catch(() => {});

    router.push("/icecream/feed");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-2 inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-medium text-[color:var(--color-error)] shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        Block user
      </button>

      {confirming ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={() => setConfirming(false)}
        >
          <div className="absolute inset-0 bg-[color:var(--color-backdrop)]" />
          <div
            className="relative w-full max-w-sm rounded-3xl bg-[color:var(--surface-elevated)] p-6 shadow-2xl ring-1 ring-[color:var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Block {handle}?
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
              Their logs will no longer appear in your feed.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-full bg-[color:var(--surface-elevated-alt)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)] transition hover:brightness-95 dark:hover:brightness-110"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBlock()}
                disabled={submitting}
                className="flex-1 rounded-full bg-[color:var(--color-error)] px-4 py-2 text-sm font-semibold text-[color:var(--text-inverse)] transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? "Blocking…" : "Block"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <Toast key={toast.id} message={toast.message} onDismiss={dismissToast} />
      ) : null}
    </>
  );
}
