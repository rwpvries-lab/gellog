"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Icon } from "@/src/components/icons";

export type PersonProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function ConnectionAvatar({
  avatarUrl,
  name,
  personInitial,
}: {
  avatarUrl: string | null;
  name: string;
  personInitial: string;
}) {
  const [imgError, setImgError] = useState(false);
  return avatarUrl && !imgError ? (
    <Image
      src={avatarUrl}
      alt={name}
      width={40}
      height={40}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-[color:var(--color-teal)] text-sm font-semibold text-[color:var(--color-on-brand)]">
      {personInitial}
    </span>
  );
}

// ─── Following row: Follows you badge + unfollow (hide badge during confirm) ──

function FollowingRowAction({
  currentUserId,
  targetId,
  followsMe,
  initialIsFollowing,
}: {
  currentUserId: string;
  targetId: string;
  followsMe: boolean;
  initialIsFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function unfollow() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("friendships")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", targetId);
    setIsFollowing(false);
    setConfirm(false);
    setLoading(false);
  }

  async function follow() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("friendships")
      .insert({ follower_id: currentUserId, following_id: targetId });
    setIsFollowing(true);
    setLoading(false);
  }

  if (!isFollowing) {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        {followsMe && !confirm && <FollowsYouBadge />}
        <button
          type="button"
          onClick={() => void follow()}
          disabled={loading}
          style={{
            background: "var(--color-orange)",
            color: "white",
            border: "none",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {loading ? "…" : "Follow"}
        </button>
      </div>
    );
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => void unfollow()}
          disabled={loading}
          style={{
            background: "none",
            color: "var(--color-error)",
            border: "1px solid var(--color-error)",
            borderRadius: 20,
            padding: "5px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {loading ? "…" : "Unfollow"}
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          style={{
            background: "var(--color-surface-alt)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: 20,
            padding: "5px 12px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {followsMe && <FollowsYouBadge />}
      <button
        type="button"
        onClick={() => setConfirm(true)}
        style={{
          background: "var(--color-teal)",
          color: "white",
          border: "none",
          borderRadius: 20,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Following ✓
      </button>
    </div>
  );
}

// ─── Follower row: "Follower ✓" → Remove follower ─────────────────────────────

function FollowerRowAction({
  currentUserId,
  followerId,
}: {
  currentUserId: string;
  followerId: string;
}) {
  const [removed, setRemoved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function removeFollower() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("friendships")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", currentUserId);
    setRemoved(true);
    setConfirm(false);
    setLoading(false);
  }

  if (removed) {
    return (
      <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>
        Removed
      </span>
    );
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => void removeFollower()}
          disabled={loading}
          style={{
            background: "none",
            color: "var(--color-error)",
            border: "1px solid var(--color-error)",
            borderRadius: 20,
            padding: "5px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {loading ? "…" : "Remove"}
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          style={{
            background: "var(--color-surface-alt)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: 20,
            padding: "5px 12px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      style={{
        background: "var(--color-surface-alt)",
        color: "var(--color-text-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: 20,
        padding: "6px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      Follower ✓
    </button>
  );
}

// ─── Shared badge ─────────────────────────────────────────────────────────────

function FollowsYouBadge() {
  return (
    <span
      style={{
        background: "var(--color-teal-bg)",
        color: "var(--color-teal)",
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 20,
        padding: "2px 7px",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      Follows you
    </span>
  );
}

type FollowerRow = {
  profiles: PersonProfile | PersonProfile[] | null;
};

function extractProfile(row: FollowerRow): PersonProfile | null {
  const p = row.profiles;
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

function ConnectionsListSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i}>
          {i > 0 && (
            <div
              style={{
                height: "0.5px",
                background: "var(--color-border)",
                marginLeft: 68,
              }}
            />
          )}
          <div
            className="flex animate-pulse items-center gap-3 px-4 py-3"
            style={{ minHeight: 64 }}
          >
            <div
              className="flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700"
              style={{ width: 44, height: 44 }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-3.5 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="h-8 w-20 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  viewedUserId: string;
  viewedUsername: string;
  currentUserId: string | null;
  initialTab: "followers" | "following";
};

export function ConnectionsClient({
  viewedUserId,
  viewedUsername,
  currentUserId,
  initialTab,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<PersonProfile[]>([]);
  const [following, setFollowing] = useState<PersonProfile[]>([]);
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);
  const [myFollowerIds, setMyFollowerIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();

      const [followersRes, followingRes, myFollowingRes, myFollowersRes] =
        await Promise.all([
          supabase
            .from("friendships")
            .select(
              "profiles!follower_id(id, username, display_name, avatar_url)",
            )
            .eq("following_id", viewedUserId),
          supabase
            .from("friendships")
            .select(
              "profiles!following_id(id, username, display_name, avatar_url)",
            )
            .eq("follower_id", viewedUserId),
          currentUserId
            ? supabase
                .from("friendships")
                .select("following_id")
                .eq("follower_id", currentUserId)
            : Promise.resolve({
                data: [] as { following_id: string }[],
                error: null,
              }),
          currentUserId
            ? supabase
                .from("friendships")
                .select("follower_id")
                .eq("following_id", currentUserId)
            : Promise.resolve({
                data: [] as { follower_id: string }[],
                error: null,
              }),
        ]);

      if (cancelled) return;

      const nextFollowers: PersonProfile[] = (followersRes.data ?? [])
        .map((r) => extractProfile(r as FollowerRow))
        .filter((p): p is PersonProfile => p !== null);

      const nextFollowing: PersonProfile[] = (followingRes.data ?? [])
        .map((r) => extractProfile(r as FollowerRow))
        .filter((p): p is PersonProfile => p !== null);

      setFollowers(nextFollowers);
      setFollowing(nextFollowing);
      setMyFollowingIds(
        (myFollowingRes.data ?? []).map((r) => r.following_id),
      );
      setMyFollowerIds((myFollowersRes.data ?? []).map((r) => r.follower_id));
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [viewedUserId, currentUserId]);

  const list = activeTab === "followers" ? followers : following;
  const query = search.trim().toLowerCase();
  const filtered = query
    ? list.filter(
        (p) =>
          (p.username ?? "").toLowerCase().includes(query) ||
          (p.display_name ?? "").toLowerCase().includes(query),
      )
    : list;

  return (
    <main
      style={{ background: "var(--color-surface-alt)", minHeight: "100vh" }}
      className="px-4 pb-24 pt-6"
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
            aria-label="Back"
          >
            <Icon name="GellogBack" size={18} strokeWidth={2} />
          </button>
          <h1
            style={{
              color: "var(--color-text-primary)",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            @{viewedUsername}
          </h1>
        </div>

        {/* Tab toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: 3,
          }}
        >
          {(["followers", "following"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                borderRadius: 9,
                padding: "8px 0",
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "background 150ms, color 150ms",
                background: activeTab === tab ? "var(--color-orange)" : "transparent",
                color: activeTab === tab ? "white" : "var(--color-text-secondary)",
                boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {tab === "followers"
                ? loading
                  ? "Followers"
                  : `Followers · ${followers.length}`
                : loading
                  ? "Following"
                  : `Following · ${following.length}`}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)",
              pointerEvents: "none",
              display: "flex",
            }}
          >
            <Icon name="GellogSearch" size={15} strokeWidth={2} />
          </span>
          <input
            type="search"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "10px 12px 10px 36px",
              fontSize: 15,
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
        </div>

        {/* List */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <ConnectionsListSkeleton />
          ) : filtered.length === 0 ? (
            <p
              className="py-10 text-center"
              style={{ color: "var(--color-text-secondary)", fontSize: 14 }}
            >
              {query ? "No results." : `No ${activeTab} yet.`}
            </p>
          ) : (
            filtered.map((person, i) => {
              const name =
                person.display_name?.trim() || person.username || "Unknown";
              const handle = person.username ?? null;
              const personInitial = name.charAt(0).toUpperCase();
              const followsMe = myFollowerIds.includes(person.id);

              return (
                <div key={person.id}>
                  {i > 0 && (
                    <div
                      style={{
                        height: "0.5px",
                        background: "var(--color-border)",
                        marginLeft: 68,
                      }}
                    />
                  )}
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ minHeight: 64 }}
                  >
                    {/* Avatar */}
                    <Link
                      href={handle ? `/profile/${handle}` : "#"}
                      className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full"
                    >
                      <ConnectionAvatar
                        avatarUrl={person.avatar_url}
                        name={name}
                        personInitial={personInitial}
                      />
                    </Link>

                    {/* Name + handle */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link
                        href={handle ? `/profile/${handle}` : "#"}
                        style={{
                          color: "var(--color-text-primary)",
                          fontSize: 14,
                          fontWeight: 600,
                          textDecoration: "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </Link>
                      {handle && (
                        <span
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: 13,
                          }}
                        >
                          @{handle}
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    {currentUserId && currentUserId !== person.id && (
                      activeTab === "following" ? (
                        <FollowingRowAction
                          currentUserId={currentUserId}
                          targetId={person.id}
                          followsMe={followsMe}
                          initialIsFollowing={myFollowingIds.includes(person.id)}
                        />
                      ) : (
                        <FollowerRowAction
                          currentUserId={currentUserId}
                          followerId={person.id}
                        />
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
