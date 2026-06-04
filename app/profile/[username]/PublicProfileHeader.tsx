"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Icon } from "@/src/components/icons";
import { FollowButton } from "./FollowButton";

type PublicProfileHeaderProps = {
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  username: string;
  followerCount: number;
  followingCount: number;
  /** Viewer's id; undefined for anonymous visitors. */
  viewerId?: string;
  targetUserId: string;
  isOwnProfile: boolean;
  isFollowing: boolean;
};

const ROUND_BTN: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 999,
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-float)",
  border: "1px solid var(--color-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  textDecoration: "none",
};

const COUNT_NUM: CSSProperties = {
  color: "var(--color-text-primary)",
  fontSize: 16,
  fontWeight: 700,
};

const COUNT_LABEL: CSSProperties = {
  color: "var(--color-text-secondary)",
  fontSize: 12,
  fontWeight: 500,
};

export function PublicProfileHeader({
  displayName,
  initial,
  avatarUrl,
  username,
  followerCount,
  followingCount,
  viewerId,
  targetUserId,
  isOwnProfile,
  isFollowing,
}: PublicProfileHeaderProps) {
  const [imgError, setImgError] = useState(false);
  const handle = username?.trim() ? `@${username.trim()}` : null;
  const connectionsBase = username?.trim()
    ? `/profile/${username.trim()}/connections`
    : null;

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayName} on Gellog`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // silently fail
    }
  }

  return (
    <header className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-3">
        <Link href="/icecream/feed" style={ROUND_BTN} aria-label="Back">
          <Icon name="GellogBack" size={20} strokeWidth={2} />
        </Link>
        <button
          type="button"
          onClick={() => void handleShare()}
          style={ROUND_BTN}
          aria-label="Share profile"
        >
          <Icon name="GellogShare" size={20} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 pb-1">
        <span
          className="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-surface)]"
          style={{
            width: 86,
            height: 86,
            border: "3px solid var(--color-teal)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          <span className="relative block h-20 w-20 overflow-hidden rounded-full">
            {avatarUrl && !imgError ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                priority
                onError={() => setImgError(true)}
              />
            ) : (
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--color-on-brand)",
                  background: "var(--color-teal)",
                }}
                className="flex h-full w-full items-center justify-center"
              >
                {initial}
              </span>
            )}
          </span>
        </span>

        <h1
          style={{
            color: "var(--color-text-primary)",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginTop: 4,
          }}
        >
          {displayName}
        </h1>

        {handle ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
            {handle}
          </p>
        ) : null}

        <div className="mt-1 flex items-center gap-4">
          {connectionsBase ? (
            <Link
              href={`${connectionsBase}?tab=following`}
              className="flex items-baseline gap-1"
              style={{ textDecoration: "none" }}
            >
              <span style={COUNT_NUM}>{followingCount}</span>
              <span style={COUNT_LABEL}>Following</span>
            </Link>
          ) : (
            <span className="flex items-baseline gap-1">
              <span style={COUNT_NUM}>{followingCount}</span>
              <span style={COUNT_LABEL}>Following</span>
            </span>
          )}
          <div
            style={{
              width: 1,
              height: 16,
              background: "var(--color-text-secondary)",
              opacity: 0.35,
            }}
          />
          {connectionsBase ? (
            <Link
              href={`${connectionsBase}?tab=followers`}
              className="flex items-baseline gap-1"
              style={{ textDecoration: "none" }}
            >
              <span style={COUNT_NUM}>{followerCount}</span>
              <span style={COUNT_LABEL}>Followers</span>
            </Link>
          ) : (
            <span className="flex items-baseline gap-1">
              <span style={COUNT_NUM}>{followerCount}</span>
              <span style={COUNT_LABEL}>Followers</span>
            </span>
          )}
        </div>

        {isOwnProfile ? (
          <Link
            href="/settings"
            className="mt-2 inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Edit profile
          </Link>
        ) : viewerId ? (
          <div className="mt-2">
            <FollowButton
              currentUserId={viewerId}
              targetUserId={targetUserId}
              initialIsFollowing={isFollowing}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
