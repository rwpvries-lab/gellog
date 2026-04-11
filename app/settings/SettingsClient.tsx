"use client";

import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import { deletePushSubscription, subscribeToPush } from "@/src/lib/push";
import {
  LOCATION_DENIED_TROUBLESHOOT_HINT,
} from "@/src/lib/locationMessages";
import { userFacingPushError } from "@/src/lib/userFacingError";
import { useThemeToggle } from "@/src/app/ThemeProvider";
import { type Visibility } from "@/src/components/VisibilityPicker";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/src/components/icons";

// ─── Shared primitives ────────────────────────────────────────────────────────

const SECTION_LABEL: React.CSSProperties = {
  color: "var(--color-text-secondary)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const CARD: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  overflow: "hidden",
};

const ROW: React.CSSProperties = {
  minHeight: 52,
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

function Sep() {
  return (
    <div
      style={{
        height: "0.5px",
        background: "var(--color-border)",
        marginLeft: 16,
      }}
    />
  );
}

type GeolocationPermissionUi = "granted" | "denied" | "prompt";

function LocationPermissionChip({
  state,
  requesting,
}: {
  state: GeolocationPermissionUi;
  requesting: boolean;
}) {
  const label =
    state === "granted"
      ? "Granted"
      : state === "denied"
        ? "Denied"
        : "Not set";
  const chipStyle: CSSProperties =
    state === "granted"
      ? {
          background: "color-mix(in srgb, var(--color-teal) 20%, transparent)",
          color: "var(--color-teal)",
        }
      : state === "denied"
        ? {
            background: "var(--color-error-surface)",
            color: "var(--color-error)",
          }
        : {
            background: "var(--color-surface-alt)",
            color: "var(--color-text-secondary)",
          };
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "5px 11px",
        borderRadius: 999,
        flexShrink: 0,
        ...chipStyle,
      }}
    >
      {requesting ? "…" : label}
    </span>
  );
}

function Chevron() {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 7 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M1 1l5 5-5 5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  userId: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  initialDefaultVisibility: Visibility;
  initialNotificationsEnabled: boolean;
  tier: "free" | "premium";
  expiresLabel: string | null;
  ownedSalon: { name: string; placeId: string } | null;
  showUpgradeSuccess: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsClient({
  userId,
  email,
  username,
  displayName: initialDisplayName,
  avatarUrl,
  initialDefaultVisibility,
  initialNotificationsEnabled,
  tier,
  expiresLabel,
  ownedSalon,
  showUpgradeSuccess,
}: Props) {
  const router = useRouter();
  const { mode: themeMode, setMode: setThemeMode } = useThemeToggle();

  const [defaultVisibility, setDefaultVisibility] =
    useState<Visibility>(initialDefaultVisibility);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initialNotificationsEnabled,
  );
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  const [geoPerm, setGeoPerm] = useState<GeolocationPermissionUi>("prompt");
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [geoRequesting, setGeoRequesting] = useState(false);

  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(initialDisplayName ?? "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(avatarUrl);
  const [editAvatarImgError, setEditAvatarImgError] = useState(false);
  const [accountAvatarImgError, setAccountAvatarImgError] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const displayName = username ?? email.split("@")[0] ?? "You";
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    setAccountAvatarImgError(false);
  }, [avatarUrl]);

  useEffect(() => {
    let cancelled = false;
    let registered: PermissionStatus | null = null;
    const onChange = () => {
      if (registered) {
        setGeoPerm(registered.state as GeolocationPermissionUi);
      }
    };

    void (async () => {
      if (typeof window === "undefined") return;
      if (!navigator.permissions?.query) {
        if (!cancelled) setGeoPerm("prompt");
        return;
      }
      try {
        const status = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (cancelled) return;
        registered = status;
        setGeoPerm(status.state as GeolocationPermissionUi);
        status.addEventListener("change", onChange);
      } catch {
        if (!cancelled) setGeoPerm("prompt");
      }
    })();

    return () => {
      cancelled = true;
      registered?.removeEventListener("change", onChange);
    };
  }, []);

  function handleLocationRowClick() {
    setGeoHint(null);
    if (geoPerm === "granted") {
      return;
    }
    if (!("geolocation" in navigator) || !navigator.geolocation) {
      setGeoHint("Location isn't supported in this browser.");
      return;
    }
    /**
     * Always call getCurrentPosition on tap (including when the chip says Denied).
     * iOS Safari often mis-reports `permissions.query` while the site is set to Allow;
     * a real request can still succeed.
     */
    setGeoRequesting(true);
    navigator.geolocation.getCurrentPosition(
      async () => {
        setGeoRequesting(false);
        setGeoHint(null);
        try {
          if (navigator.permissions?.query) {
            const s = await navigator.permissions.query({
              name: "geolocation" as PermissionName,
            });
            setGeoPerm(s.state as GeolocationPermissionUi);
          } else {
            setGeoPerm("granted");
          }
        } catch {
          setGeoPerm("granted");
        }
      },
      async (err) => {
        setGeoRequesting(false);
        try {
          if (navigator.permissions?.query) {
            const s = await navigator.permissions.query({
              name: "geolocation" as PermissionName,
            });
            setGeoPerm(s.state as GeolocationPermissionUi);
          } else {
            setGeoPerm("denied");
          }
        } catch {
          setGeoPerm("denied");
        }
        const code = (err as GeolocationPositionError).code;
        if (code === 1) {
          setGeoHint(
            `To enable location, go to your browser Settings > Site permissions > Location. ${LOCATION_DENIED_TROUBLESHOOT_HINT}`,
          );
        } else {
          setGeoHint(
            "We couldn’t read your location. Check that Location Services are on and try again.",
          );
        }
      },
      { maximumAge: 0, timeout: 15000, enableHighAccuracy: false },
    );
  }

  async function handleVisibilityChange(v: Visibility) {
    setDefaultVisibility(v);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ default_visibility: v })
      .eq("id", userId);
  }

  async function handleNotificationsToggle() {
    setNotifLoading(true);
    setNotifError(null);
    try {
      if (notificationsEnabled) {
        await deletePushSubscription();
        setNotificationsEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setNotifError(
            "Permission denied. Enable notifications in your browser settings.",
          );
          return;
        }
        await subscribeToPush();
        setNotificationsEnabled(true);
      }
    } catch (e) {
      setNotifError(
        userFacingPushError(
          e,
          "Couldn't update notification settings. Please try again.",
        ),
      );
    } finally {
      setNotifLoading(false);
    }
  }

  async function handleUpgrade() {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setUpgradeLoading(false);
    }
  }

  async function handleRestore() {
    setRestoreLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setRestoreLoading(false);
    }
  }

  async function handleManageSubscription() {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      // silently fail
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await fetch("/api/account/delete", { method: "POST" });
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      setDeleteError("Could not delete account. Please contact support.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const blob = await resizeImageBeforeUpload(file, 400, 0.85);
      const path = `avatars/${userId}.webp`;
      await supabase.storage.from("log-photos").upload(path, blob, {
        upsert: true,
        cacheControl: "3600",
        contentType: "image/webp",
      });
      const { data: { publicUrl } } = supabase.storage.from("log-photos").getPublicUrl(path);
      setEditAvatarUrl(publicUrl);
      setEditAvatarImgError(false);
    } catch {
      // silently fail — user can retry
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  }

  async function handleEditSave() {
    setEditSaving(true);
    setEditError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editDisplayName.trim() || null,
          avatar_url: editAvatarUrl,
        })
        .eq("id", userId);
      if (error) throw error;
      setShowEditSheet(false);
      router.refresh();
    } catch {
      setEditError("Could not save changes. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
    { value: "public", label: "Public" },
    { value: "friends", label: "Friends" },
    { value: "private", label: "Private" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-2 pb-4">

      {/* Back + heading */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/icecream/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
          aria-label="Back"
        >
          <Icon name="GellogBack" size={18} strokeWidth={2} />
        </Link>
        <h1
          style={{
            color: "var(--color-text-primary)",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Settings
        </h1>
      </div>

      {showUpgradeSuccess && (
        <div
          style={{
            background: "var(--color-teal-bg)",
            border: "1px solid var(--color-teal)",
            borderRadius: 12,
            padding: "12px 16px",
            color: "var(--color-teal)",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          Welcome to Ice Cream+ — your subscription is active. 🎉
        </div>
      )}

      {/* ── Section 1: Account ── */}
      <div>
        <p style={SECTION_LABEL}>Account</p>
        <div style={CARD}>
          {/* Profile picture + Edit profile */}
          <button
            type="button"
            onClick={() => setShowEditSheet(true)}
            style={{ ...ROW, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="relative flex-shrink-0 overflow-hidden rounded-full bg-[color:var(--color-teal)]"
                style={{ width: 40, height: 40 }}
              >
                {avatarUrl && !accountAvatarImgError ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setAccountAvatarImgError(true)}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[color:var(--color-on-brand)]">
                    {initial}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  Edit profile
                </span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                  {initialDisplayName ?? username ?? email.split("@")[0]}
                </span>
              </div>
            </div>
            <Chevron />
          </button>

          <Sep />

          {/* Username (read-only display) */}
          <div style={ROW}>
            <span
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              Username
            </span>
            <span
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "60%",
              }}
            >
              {username ? `@${username}` : "Not set"}
            </span>
          </div>

          <Sep />

          {/* Email (read-only) */}
          <div style={ROW}>
            <span
              style={{ color: "var(--color-text-secondary)", fontSize: 15 }}
            >
              Email
            </span>
            <span
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "60%",
              }}
            >
              {email}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Upgrade / Active ── */}
      <div>
        <p style={SECTION_LABEL}>Subscription</p>
        {tier === "premium" ? (
          /* Active subscription card */
          <div
            style={{
              ...CARD,
              borderColor: "var(--color-teal)",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className="flex items-center justify-between">
              <p
                style={{
                  color: "var(--color-text-primary)",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Active — Ice Cream+
              </p>
              <span
                style={{
                  background: "var(--color-teal)",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 20,
                  padding: "3px 10px",
                }}
              >
                Active
              </span>
            </div>
            {expiresLabel && (
              <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                Renews {expiresLabel}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleManageSubscription()}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--color-teal)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Manage subscription →
            </button>
          </div>
        ) : (
          /* Upgrade card */
          <div
            style={{
              ...CARD,
              borderColor: "var(--color-orange)",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "relative",
            }}
          >
            {/* Badge */}
            <span
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "var(--color-orange)",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 20,
                padding: "3px 10px",
                letterSpacing: "0.02em",
              }}
            >
              Ice Cream+
            </span>

            <p
              style={{
                color: "var(--color-text-primary)",
                fontSize: 17,
                fontWeight: 700,
                paddingRight: 80,
              }}
            >
              Unlock the full Gellog experience
            </p>

            <ul className="flex flex-col gap-2">
              {[
                "Advanced stats and flavour analytics",
                "Ice cream passport with animated stamps",
                "Priority support and early features",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="8" fill="var(--color-teal)" />
                    <path
                      d="M4.5 8l2.5 2.5 4.5-4.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: 14,
                    }}
                  >
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            <p
              style={{ color: "var(--color-text-secondary)", fontSize: 13 }}
            >
              €2.99 per month or €19 per year
            </p>

            <button
              type="button"
              onClick={() => void handleUpgrade()}
              disabled={upgradeLoading}
              style={{
                background: "var(--color-orange)",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 600,
                cursor: upgradeLoading ? "not-allowed" : "pointer",
                opacity: upgradeLoading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {upgradeLoading && (
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    flexShrink: 0,
                  }}
                />
              )}
              {upgradeLoading ? "Redirecting…" : "Upgrade now"}
            </button>

            <button
              type="button"
              onClick={() => void handleRestore()}
              disabled={restoreLoading}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--color-text-secondary)",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              {restoreLoading ? "Loading…" : "Restore purchase"}
            </button>
          </div>
        )}
      </div>

      {/* ── Section 3: Preferences ── */}
      <div>
        <p style={SECTION_LABEL}>Preferences</p>
        <div style={CARD}>
          {/* Default visibility */}
          <div style={{ ...ROW, flexDirection: "column", alignItems: "stretch", paddingTop: 12, paddingBottom: 12, minHeight: "auto", gap: 10 }}>
            <span style={{ color: "var(--color-text-primary)", fontSize: 15, fontWeight: 500 }}>
              Default post visibility
            </span>
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-alt)",
                borderRadius: 10,
                padding: 3,
              }}
            >
              {VISIBILITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void handleVisibilityChange(value)}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    padding: "6px 0",
                    fontSize: 13,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    transition: "background 150ms, color 150ms",
                    background:
                      defaultVisibility === value
                        ? "var(--color-surface)"
                        : "transparent",
                    color:
                      defaultVisibility === value
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                    boxShadow:
                      defaultVisibility === value
                        ? "0 1px 3px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Sep />

          {/* Theme picker */}
          <div style={{ ...ROW, flexDirection: "column", alignItems: "stretch", paddingTop: 12, paddingBottom: 12, minHeight: "auto", gap: 10 }}>
            <span style={{ color: "var(--color-text-primary)", fontSize: 15, fontWeight: 500 }}>
              Theme
            </span>
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-alt)",
                borderRadius: 10,
                padding: 3,
              }}
            >
              {(["light", "system", "dark"] as const).map((m) => {
                const label = m === "light" ? "Light" : m === "system" ? "Device" : "Dark";
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setThemeMode(m)}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      padding: "6px 0",
                      fontSize: 13,
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      transition: "background 150ms, color 150ms",
                      background: themeMode === m ? "var(--color-surface)" : "transparent",
                      color: themeMode === m ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      boxShadow: themeMode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Sep />

          {/* Notifications */}
          <div style={{ ...ROW, flexDirection: "column", alignItems: "stretch", padding: "0 16px" }}>
            <div style={{ ...ROW, padding: 0, minHeight: 52 }}>
              <span
                style={{
                  color: "var(--color-text-primary)",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                Notifications
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                disabled={notifLoading}
                onClick={() => void handleNotificationsToggle()}
                style={{
                  position: "relative",
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  border: "none",
                  cursor: notifLoading ? "not-allowed" : "pointer",
                  transition: "background 200ms",
                  background: notificationsEnabled
                    ? "var(--color-teal)"
                    : "var(--color-border)",
                  flexShrink: 0,
                  opacity: notifLoading ? 0.6 : 1,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: notificationsEnabled ? 21 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    transition: "left 200ms",
                  }}
                />
              </button>
            </div>
            {notifError && (
              <p
                style={{
                  color: "var(--color-error)",
                  fontSize: 12,
                  paddingBottom: 10,
                }}
              >
                {notifError}
              </p>
            )}
          </div>

          <Sep />

          {/* Location (geolocation permission) */}
          <div style={{ ...ROW, flexDirection: "column", alignItems: "stretch", padding: "0 16px" }}>
            <button
              type="button"
              onClick={handleLocationRowClick}
              disabled={geoRequesting}
              style={{
                ...ROW,
                padding: 0,
                minHeight: 52,
                width: "100%",
                border: "none",
                background: "none",
                cursor: geoRequesting ? "wait" : "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  color: "var(--color-text-primary)",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                Location
              </span>
              <LocationPermissionChip state={geoPerm} requesting={geoRequesting} />
            </button>
            {geoHint ? (
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 12,
                  lineHeight: 1.45,
                  paddingBottom: 12,
                  marginTop: -4,
                }}
              >
                {geoHint}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Section 4: Salon (conditional) ── */}
      {ownedSalon && (
        <div>
          <p style={SECTION_LABEL}>Salon</p>
          <div style={CARD}>
            <Link
              href={`/salon/${ownedSalon.placeId}/dashboard`}
              style={{ ...ROW, textDecoration: "none" }}
            >
              <span
                style={{
                  color: "var(--color-text-primary)",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                Manage {ownedSalon.name}
              </span>
              <Chevron />
            </Link>
          </div>
        </div>
      )}

      {/* ── Section 5: Support ── */}
      <div>
        <p style={SECTION_LABEL}>Support</p>
        <div style={CARD}>
          <Link href="/privacy" style={{ ...ROW, textDecoration: "none" }}>
            <span
              style={{
                color: "var(--color-text-primary)",
                fontSize: 15,
              }}
            >
              Privacy policy
            </span>
            <Chevron />
          </Link>

          <Sep />

          <Link href="/terms" style={{ ...ROW, textDecoration: "none" }}>
            <span
              style={{
                color: "var(--color-text-primary)",
                fontSize: 15,
              }}
            >
              Terms of service
            </span>
            <Chevron />
          </Link>

          <Sep />

          <a
            href="mailto:support@gellog.app"
            style={{ ...ROW, textDecoration: "none" }}
          >
            <span
              style={{
                color: "var(--color-text-primary)",
                fontSize: 15,
              }}
            >
              Contact / feedback
            </span>
            <ExternalIcon />
          </a>

          <Sep />

          <div style={ROW}>
            <span
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 15,
              }}
            >
              App version
            </span>
            <span
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 14,
              }}
            >
              0.7.0
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 6: Danger Zone ── */}
      <div>
        <p style={SECTION_LABEL}>Account actions</p>
        <div style={CARD}>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            style={{
              ...ROW,
              width: "100%",
              border: "none",
              background: "none",
              cursor: loggingOut ? "not-allowed" : "pointer",
              color: "var(--color-error)",
              fontSize: 15,
              fontWeight: 500,
              justifyContent: "flex-start",
              opacity: loggingOut ? 0.6 : 1,
            }}
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>

          <Sep />

          <button
            type="button"
            onClick={() => setShowDeleteSheet(true)}
            style={{
              ...ROW,
              width: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--color-error)",
              fontSize: 15,
              fontWeight: 500,
              justifyContent: "flex-start",
            }}
          >
            Delete account
          </button>
        </div>
      </div>

      {/* ── Delete account confirmation sheet ── */}
      {showDeleteSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowDeleteSheet(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 40px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--color-border)" }} />

            <p style={{ color: "var(--color-text-primary)", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              Delete account?
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              This will permanently delete your account and all your logs. This cannot be undone.
            </p>

            {deleteError && (
              <p style={{ color: "var(--color-error)", fontSize: 13, marginBottom: 12 }}>
                {deleteError}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                style={{
                  background: "#DC2626",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 0",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteSheet(false)}
                style={{
                  background: "var(--color-surface-alt)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: "14px 0",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit profile sheet ── */}
      {showEditSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowEditSheet(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 40px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--color-border)" }} />

            <p style={{ color: "var(--color-text-primary)", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
              Edit profile
            </p>

            {/* Hidden file input for avatar */}
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e)}
            />

            <div className="flex flex-col gap-4">
              {/* Avatar picker */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarUploading}
                  style={{ background: "none", border: "none", cursor: avatarUploading ? "not-allowed" : "pointer", padding: 0 }}
                >
                  <div
                    className="relative overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500"
                    style={{ width: 72, height: 72, opacity: avatarUploading ? 0.6 : 1 }}
                  >
                    {editAvatarUrl && !editAvatarImgError ? (
                      <Image
                        src={editAvatarUrl}
                        alt={displayName}
                        width={72}
                        height={72}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={() => setEditAvatarImgError(true)}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-[color:var(--color-teal)] text-2xl font-semibold text-[color:var(--color-on-brand)]">
                        {initial}
                      </span>
                    )}
                  </div>
                </button>
                <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                  {avatarUploading ? "Uploading…" : "Change photo"}
                </span>
              </div>

              {/* Display name input */}
              <div className="flex flex-col gap-1.5">
                <label style={{ color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 500 }}>
                  Display name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    background: "var(--color-surface-alt)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 15,
                    color: "var(--color-text-primary)",
                    outline: "none",
                    width: "100%",
                  }}
                />
              </div>

              {/* Username (read-only) */}
              <p style={{ color: "var(--color-text-tertiary)", fontSize: 12, lineHeight: 1.5 }}>
                Username (<span style={{ color: "var(--color-text-secondary)" }}>@{username ?? "not set"}</span>) is permanent — contact support to request a change.
              </p>

              {editError && (
                <p style={{ color: "var(--color-error)", fontSize: 13 }}>{editError}</p>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void handleEditSave()}
                  disabled={editSaving}
                  style={{
                    background: "var(--color-orange)",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 0",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: editSaving ? "not-allowed" : "pointer",
                    opacity: editSaving ? 0.7 : 1,
                  }}
                >
                  {editSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditSheet(false)}
                  style={{
                    background: "var(--color-surface-alt)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    padding: "14px 0",
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
