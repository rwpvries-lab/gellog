"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { Icon } from "@/src/components/icons";

// ─── ProfileHeader ────────────────────────────────────────────────────────────

type ProfileHeaderProps = {
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  userId: string;
  username: string;
  logCount: number;
  followerCount: number;
  followingCount: number;
};

export function ProfileHeader({
  displayName,
  initial,
  avatarUrl,
  userId,
  username,
  logCount,
  followerCount,
  followingCount,
}: ProfileHeaderProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `avatars/${userId}.${ext}`;
      await supabase.storage
        .from("log-photos")
        .upload(path, file, { upsert: true });
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

  const btnStyle: React.CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    borderRadius: 20,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  };

  return (
    <>
      <header className="flex flex-col items-center gap-5 pt-2">
        {/* Username */}
        <h1
          style={{
            color: "var(--color-text-primary)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {displayName}
        </h1>

        {/* Avatar */}
        <button
          type="button"
          onClick={() => setShowOverlay(true)}
          className="relative flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500"
          style={{
            width: 80,
            height: 80,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
          aria-label="View or change profile photo"
        >
          {currentAvatarUrl && !imgError ? (
            <Image
              src={currentAvatarUrl}
              alt={displayName}
              fill
              className="object-cover"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <span
              style={{ fontSize: 28, fontWeight: 600, color: "white" }}
              className="flex h-full w-full items-center justify-center"
            >
              {initial}
            </span>
          )}
        </button>

        {/* Nav buttons */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void handleShare()} style={btnStyle}>
            <Icon name="GellogShare" size={14} strokeWidth={2} />
            Share
          </button>
          <Link href="/settings" style={btnStyle}>
            <Icon name="GellogSettings" size={14} strokeWidth={2} />
            Settings
          </Link>
        </div>

        {/* Stats strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
            alignItems: "center",
            width: "100%",
            padding: "16px 0",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 20,
          }}
        >
          {/* Logs */}
          <div className="flex flex-col items-center gap-0.5">
            <span
              style={{
                color: "var(--color-text-primary)",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {logCount}
            </span>
            <span
              style={{ color: "var(--color-text-secondary)", fontSize: 13 }}
            >
              Logs
            </span>
          </div>

          <div style={{ background: "var(--color-border)", height: 32 }} />

          <div className="flex items-center justify-center">
            <Link
              href={`/profile/${username}/connections?tab=followers`}
              className="flex flex-col items-center gap-0.5"
              style={{ textDecoration: "none" }}
            >
              <span style={{ color: "var(--color-text-primary)", fontSize: 18, fontWeight: 700 }}>
                {followerCount}
              </span>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                Followers
              </span>
            </Link>
          </div>

          <div style={{ background: "var(--color-border)", height: 32 }} />

          <div className="flex items-center justify-center">
            <Link
              href={`/profile/${username}/connections?tab=following`}
              className="flex flex-col items-center gap-0.5"
              style={{ textDecoration: "none" }}
            >
              <span style={{ color: "var(--color-text-primary)", fontSize: 18, fontWeight: 700 }}>
                {followingCount}
              </span>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                Following
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      {/* Avatar full-screen overlay */}
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
            {/* Zoomed avatar */}
            <div
              className="relative overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500"
              style={{ width: 250, height: 250 }}
            >
              {currentAvatarUrl ? (
                <Image
                  src={currentAvatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span
                  style={{
                    fontSize: 80,
                    fontWeight: 600,
                    color: "white",
                  }}
                  className="flex h-full w-full items-center justify-center"
                >
                  {initial}
                </span>
              )}
            </div>

            {/* Buttons */}
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
