"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import { Icon } from "@/src/components/icons";

type ProfileHeaderProps = {
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  userId: string;
  username: string;
  followerCount: number;
  followingCount: number;
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
};

export function ProfileHeader({
  displayName,
  initial,
  avatarUrl,
  userId,
  username,
  followerCount,
  followingCount,
}: ProfileHeaderProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handle = username?.trim() ? `@${username.trim()}` : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const blob = await resizeImageBeforeUpload(file, 400, 0.85);
      const path = `avatars/${userId}.webp`;
      await supabase.storage.from("log-photos").upload(path, blob, {
        upsert: true,
        cacheControl: "3600",
        contentType: "image/webp",
      });
      const {
        data: { publicUrl },
      } = supabase.storage.from("log-photos").getPublicUrl(path);
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      setCurrentAvatarUrl(publicUrl);
      setImgError(false);
      setShowOverlay(false);
    } catch {
      // silently fail — user can retry
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
    <>
      <header className="flex w-full flex-col gap-4">
        <div className="flex w-full items-start justify-end gap-3">
          <button
            type="button"
            onClick={() => void handleShare()}
            style={ROUND_BTN}
            aria-label="Share profile"
          >
            <Icon name="GellogShare" size={20} strokeWidth={2} />
          </button>
          <Link href="/settings" style={ROUND_BTN} aria-label="Settings">
            <Icon name="GellogSettings" size={20} strokeWidth={2} />
          </Link>
        </div>

        <div className="flex flex-col items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => setShowOverlay(true)}
            className="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-surface)] ring-1 ring-[color:var(--color-border)]"
            style={{
              width: 86,
              height: 86,
              border: "3px solid var(--color-teal)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            }}
            aria-label="View or change profile photo"
          >
            <span className="relative block h-20 w-20 overflow-hidden rounded-full">
              {currentAvatarUrl && !imgError ? (
                <Image
                  src={currentAvatarUrl}
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
          </button>

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
            <p
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 14,
              }}
            >
              {handle}
            </p>
          ) : null}

          <div className="mt-1 flex items-center gap-4">
            {username?.trim() ? (
              <>
                <Link
                  href={`/profile/${username.trim()}/connections?tab=following`}
                  className="flex items-baseline gap-1"
                  style={{ textDecoration: "none" }}
                >
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {followingCount}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Following
                  </span>
                </Link>
                <div
                  style={{
                    width: 1,
                    height: 16,
                    background: "var(--color-text-secondary)",
                    opacity: 0.35,
                  }}
                />
                <Link
                  href={`/profile/${username.trim()}/connections?tab=followers`}
                  className="flex items-baseline gap-1"
                  style={{ textDecoration: "none" }}
                >
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {followerCount}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Followers
                  </span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <span className="flex items-baseline gap-1">
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {followingCount}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Following
                  </span>
                </span>
                <div
                  style={{
                    width: 1,
                    height: 16,
                    background: "var(--color-text-secondary)",
                    opacity: 0.35,
                  }}
                />
                <span className="flex items-baseline gap-1">
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {followerCount}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Followers
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      {showOverlay && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.88)" }}
          onClick={() => setShowOverlay(false)}
        >
          <div
            className="flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500"
              style={{ width: 250, height: 250 }}
            >
              {currentAvatarUrl && !imgError ? (
                <Image
                  src={currentAvatarUrl}
                  alt={displayName}
                  width={250}
                  height={250}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span
                  style={{
                    fontSize: 80,
                    fontWeight: 600,
                    color: "var(--color-on-brand)",
                    background: "var(--color-teal)",
                  }}
                  className="flex h-full w-full items-center justify-center"
                >
                  {initial}
                </span>
              )}
            </div>

            <div className="flex w-56 flex-col gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  background: "var(--color-orange)",
                  color: "white",
                  borderRadius: 24,
                  padding: "13px 0",
                  fontSize: 15,
                  fontWeight: 600,
                  border: "none",
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploading ? "Uploading…" : "Change photo"}
              </button>
              <button
                type="button"
                onClick={() => setShowOverlay(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  borderRadius: 24,
                  padding: "13px 0",
                  fontSize: 15,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
