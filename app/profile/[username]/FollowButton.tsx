'use client';

import { createClient } from "@/src/lib/supabase/client";
import { useState } from "react";

type FollowButtonProps = {
  currentUserId: string;
  targetUserId: string;
  initialIsFollowing: boolean;
};

export function FollowButton({ currentUserId, targetUserId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function follow() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("friendships").insert({ follower_id: currentUserId, following_id: targetUserId });
    setIsFollowing(true);
    setLoading(false);
  }

  async function unfollow() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("friendships").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId);
    setIsFollowing(false);
    setShowConfirm(false);
    setLoading(false);
  }

  if (isFollowing) {
    if (showConfirm) {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void unfollow()}
            disabled={loading}
            className="inline-flex h-8 items-center justify-center rounded-full border border-red-200 bg-white px-3 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-zinc-800"
          >
            {loading ? "…" : "Unfollow"}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex h-8 items-center justify-center rounded-full bg-teal-500 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
      >
        Following ✓
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void follow()}
      disabled={loading}
      className="inline-flex h-8 items-center justify-center rounded-full bg-orange-500 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-950"
    >
      {loading ? "…" : "Follow"}
    </button>
  );
}
