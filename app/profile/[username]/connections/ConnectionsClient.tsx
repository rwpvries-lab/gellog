"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Icon } from "@/src/components/icons";

export type PersonProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

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
            color: "#DC2626",
            border: "1px solid #DC2626",
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
            color: "#DC2626",
            border: "1px solid #DC2626",
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

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  viewedUsername: string;
  followers: PersonProfile[];
  following: PersonProfile[];
  currentUserId: string | null;
  myFollowingIds: string[];
  myFollowerIds: string[];
  initialTab: "followers" | "following";
};

export function ConnectionsClient({
  viewedUsername,
  followers,
  following,
  currentUserId,
  myFollowingIds,
  myFollowerIds,
  initialTab,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [search, setSearch] = useState("");

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
                ? `Followers · ${followers.length}`
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
          {filtered.length === 0 ? (
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
                      className="relative flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500"
                      style={{ width: 44, height: 44 }}
                    >
                      {person.avatar_url ? (
                        <Image
                          src={person.avatar_url}
                          alt={name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                          {personInitial}
                        </span>
                      )}
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
