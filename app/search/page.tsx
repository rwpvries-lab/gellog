'use client';

import { createClient } from "@/src/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FollowButton } from "@/app/profile/[username]/FollowButton";

type SearchProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  log_count: number;
};

type FollowStatus = Record<string, boolean>;

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-zinc-700" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-28 rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProfile[]>([]);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({});
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current user once on mount
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id);
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setFollowStatus({});
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(() => {
      void (async () => {
        const supabase = createClient();

        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${trimmed}%`)
          .limit(10);

        const profiles = profilesData ?? [];

        // Fetch log counts for all results in parallel
        const countResults = await Promise.all(
          profiles.map((p) =>
            supabase
              .from("ice_cream_logs")
              .select("*", { count: "exact", head: true })
              .eq("user_id", p.id)
              .eq("visibility", "public"),
          ),
        );

        const enriched: SearchProfile[] = profiles.map((p, i) => ({
          ...p,
          log_count: countResults[i].count ?? 0,
        }));

        // Fetch follow status for each result if logged in
        let newFollowStatus: FollowStatus = {};
        if (currentUserId) {
          const followResults = await Promise.all(
            profiles.map((p) =>
              supabase
                .from("friendships")
                .select("*", { count: "exact", head: true })
                .eq("follower_id", currentUserId)
                .eq("following_id", p.id),
            ),
          );
          profiles.forEach((p, i) => {
            newFollowStatus[p.id] = (followResults[i].count ?? 0) > 0;
          });
        }

        setResults(enriched);
        setFollowStatus(newFollowStatus);
        setSearched(true);
        setLoading(false);
      })();
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, currentUserId]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pb-24 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Find people
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Search for users to follow.
          </p>
        </header>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find people..."
          autoFocus
          className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-teal-500"
        />

        <div className="flex flex-col gap-3">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : searched && results.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No users found for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            results.map((profile) => {
              const displayName = profile.username ?? "Unknown";
              const initial = displayName.charAt(0).toUpperCase();
              const isOwnProfile = currentUserId === profile.id;

              return (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <Link
                    href={`/profile/${profile.username}`}
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

                  <Link href={`/profile/${profile.username}`} className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {displayName}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {profile.log_count} public scoop{profile.log_count !== 1 ? "s" : ""}
                    </span>
                  </Link>

                  {!isOwnProfile && currentUserId ? (
                    <FollowButton
                      currentUserId={currentUserId}
                      targetUserId={profile.id}
                      initialIsFollowing={followStatus[profile.id] ?? false}
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
