'use client';

import { createClient } from "@/src/lib/supabase/client";
import { FollowButton } from "@/app/profile/[username]/FollowButton";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type FollowProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type FollowListSheetProps = {
  userId: string;
  type: "followers" | "following";
  count: number;
  currentUserId?: string;
};

export function FollowListSheet({ userId, type, count, currentUserId }: FollowListSheetProps) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<FollowProfile[]>([]);
  const [loading, setLoading] = useState(false);

  async function openSheet() {
    setOpen(true);
    setLoading(true);

    const supabase = createClient();
    const { data } = type === "followers"
      ? await supabase
          .from("friendships")
          .select("profiles!follower_id(id, username, avatar_url)")
          .eq("following_id", userId)
      : await supabase
          .from("friendships")
          .select("profiles!following_id(id, username, avatar_url)")
          .eq("follower_id", userId);

    const fetched: FollowProfile[] = (data ?? [])
      .map((row) => {
        const p = (row as { profiles: FollowProfile | FollowProfile[] | null }).profiles;
        if (!p) return null;
        if (Array.isArray(p)) return p[0] ?? null;
        return p;
      })
      .filter((p): p is FollowProfile => p != null);

    setProfiles(fetched);
    setLoading(false);
  }

  const label = type === "followers" ? "followers" : "following";

  return (
    <>
      <button
        type="button"
        onClick={() => void openSheet()}
        className="text-left focus:outline-none"
      >
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{count}</span>{" "}
        <span className="hover:underline">{label}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full rounded-t-3xl bg-white shadow-2xl ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <p className="text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-50">
                {label}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-4 pb-8">
              {loading ? (
                <div className="flex flex-col gap-3 py-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex animate-pulse items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                      <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                    </div>
                  ))}
                </div>
              ) : profiles.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No {label} yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3 py-2">
                  {profiles.map((profile) => {
                    const displayName = profile.username ?? "Unknown";
                    const initial = displayName.charAt(0).toUpperCase();
                    const isSelf = currentUserId === profile.id;

                    return (
                      <div key={profile.id} className="flex items-center gap-3">
                        <Link
                          href={`/profile/${profile.username}`}
                          onClick={() => setOpen(false)}
                          className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500 text-white shadow-sm"
                        >
                          {profile.avatar_url ? (
                            <Image
                              src={profile.avatar_url}
                              alt={displayName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-sm font-semibold">
                              {initial}
                            </span>
                          )}
                        </Link>

                        <Link
                          href={`/profile/${profile.username}`}
                          onClick={() => setOpen(false)}
                          className="flex-1 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                        >
                          @{displayName}
                        </Link>

                        {currentUserId && !isSelf ? (
                          <FollowButton
                            currentUserId={currentUserId}
                            targetUserId={profile.id}
                            initialIsFollowing={type === "following"}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
