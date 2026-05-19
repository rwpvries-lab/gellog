'use client';

import { RatingStarsDisplay } from "@/app/components/RatingStars";
import { Gelato } from "@/src/components/Gelato/Gelato";
import { Toast, useToast, copyToClipboard } from "@/src/components/Toast";
import type { LogFlavour } from "@/src/lib/log-flavours-resolved";
import type { BaseToken, CrumbleToken, DrizzleToken, GelatoTokens } from "@/src/lib/gelato-tokens";
import { createClient } from "@/src/lib/supabase/client";
import { formatVisitDate } from "@/src/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type { LogFlavour };

const DIETARY_TAG_SET = new Set(["Sugar-free", "Dairy-free", "Vegan", "Nut-free", "Gluten-free"]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function getFlavourDisplayLabel(flavour: LogFlavour): string {
  const nl = flavour.canonical_name_nl?.trim();
  if (nl) return nl;
  const en = flavour.canonical_name_en?.trim();
  if (en) return en;
  const input = flavour.input_name?.trim();
  if (input) return input;
  return flavour.flavour_name?.trim() || "Flavour";
}

function gelatoTokensFromLogFlavour(flavour: LogFlavour): GelatoTokens {
  if (flavour.base_token == null) {
    return { base: "cream", drizzle: "none", crumble: "none" };
  }
  return {
    base: flavour.base_token as BaseToken,
    drizzle: (flavour.drizzle_token ?? "none") as DrizzleToken,
    crumble: (flavour.crumble_token ?? "none") as CrumbleToken,
  };
}

export type LogProfile = {
  username: string | null;
  avatar_url: string | null;
};

export type IceCreamLog = {
  id: string;
  user_id: string;
  salon_name: string;
  salon_city?: string | null;
  salon_lat: number | null;
  salon_lng: number | null;
  salon_place_id: string | null;
  overall_rating: number;
  notes: string | null;
  photo_url: string | null;
  visited_at: string;
  vessel: "cup" | "cone" | null;
  /** Stored in minor units (e.g. euro cents). */
  price_cents: number | null;
  weather_temp_c: number | null;
  weather_condition: string | null;
  weather_uv_index: number | null;
  visibility: "public" | "friends" | "private";
  photo_visibility?: "public" | "friends";
  hide_price?: boolean;
  profiles: LogProfile | null;
  log_flavours: LogFlavour[];
  like_count?: number;
  user_has_liked?: boolean;
  comment_count?: number;
};

function getPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/log-photos/${path}`;
}


const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatFullDate(isoDate: string): string {
  const d = new Date(isoDate);
  const weekday = WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${weekday} ${day} ${month} ${year} at ${hour}:${minute}`;
}

function formatWeather(log: IceCreamLog): string | null {
  const hasWeather =
    log.weather_temp_c != null || (log.weather_condition?.trim().length ?? 0) > 0;
  if (!hasWeather) return null;

  const tempNumber =
    typeof log.weather_temp_c === "number"
      ? log.weather_temp_c
      : log.weather_temp_c != null
        ? Number(log.weather_temp_c)
        : null;

  const tempPart =
    tempNumber != null && Number.isFinite(tempNumber)
      ? `${Math.round(tempNumber)}°C`
      : null;

  const conditionPart =
    log.weather_condition && log.weather_condition.trim().length > 0
      ? log.weather_condition.trim()
      : null;

  const uv = log.weather_uv_index;
  const uvPart =
    uv != null && uv >= 3
      ? `UV ${Math.round(uv)} · ${uv <= 2 ? "Low" : uv <= 5 ? "Moderate" : uv <= 7 ? "High" : uv <= 10 ? "Very High" : "Extreme"}`
      : null;

  const pieces = [tempPart, conditionPart, uvPart].filter((p): p is string => Boolean(p));
  if (pieces.length === 0) return null;
  return pieces.join(" · ");
}

/** Compact weather + city for feed metadata (no UV). */
function formatFeedWeatherLine(log: IceCreamLog): string | null {
  const tempNumber =
    typeof log.weather_temp_c === "number"
      ? log.weather_temp_c
      : log.weather_temp_c != null
        ? Number(log.weather_temp_c)
        : null;
  const tempPart =
    tempNumber != null && Number.isFinite(tempNumber)
      ? `${Math.round(tempNumber)}°C`
      : null;
  const city = log.salon_city?.trim() || null;
  const condition =
    log.weather_condition && log.weather_condition.trim().length > 0
      ? log.weather_condition.trim()
      : null;

  if (tempPart && city) return `${tempPart} · ${city}`;
  if (tempPart && condition) return `${tempPart} · ${condition}`;
  if (tempPart) return tempPart;
  if (city) return city;
  if (condition) return condition;
  return null;
}

const FEED_COLLAPSED_FLAVOUR_CAP = 3;

type AdvancedRating = { label: string; value: number };

function getAdvancedRatings(flavour: LogFlavour): AdvancedRating[] {
  const pairs: [string, number | null][] = [
    ["Texture", flavour.rating_texture],
    ["Originality", flavour.rating_originality],
    ["Intensity", flavour.rating_intensity],
    ["Presentation", flavour.rating_presentation],
  ];
  return pairs
    .filter((p): p is [string, number] => p[1] != null)
    .map(([label, value]) => ({ label, value }));
}

/** Compact scoops / vessel beside salon title (feed + default card); hidden on log detail (hero handles visuals). */
function SalonInlineFlavourScoops({
  flavours,
  vessel,
  isDetailPage,
}: {
  flavours: LogFlavour[];
  vessel: "cup" | "cone" | null;
  isDetailPage: boolean;
}) {
  if (isDetailPage || flavours.length === 0) return null;

  if (flavours.length === 1) {
    const f = flavours[0];
    if (vessel === "cup" || vessel === "cone") {
      return (
        <span className="ml-1.5 inline-flex shrink-0 items-end align-middle">
          <Gelato
            variant={vessel}
            tokens={gelatoTokensFromLogFlavour(f)}
            size={64}
            seed={f.id}
            className="flex shrink-0"
          />
        </span>
      );
    }
    return (
      <span className="ml-1.5 inline-flex shrink-0 items-end align-middle">
        <Gelato
          variant="scoop"
          tokens={gelatoTokensFromLogFlavour(f)}
          size={48}
          seed={f.id}
          className="flex shrink-0"
        />
      </span>
    );
  }

  const visible = flavours.slice(0, 3);
  const extra = flavours.length - 3;

  if (vessel === "cup" || vessel === "cone") {
    const [first, ...restVisible] = visible;
    return (
      <span className="ml-1.5 inline-flex shrink-0 items-end align-middle">
        <span className="flex shrink-0 items-end">
          <span className="relative z-[1] inline-flex shrink-0">
            <Gelato
              variant={vessel}
              tokens={gelatoTokensFromLogFlavour(first)}
              size={56}
              seed={first.id}
              className="flex shrink-0"
            />
          </span>
          {restVisible.map((f, idx) => (
            <span
              key={f.id}
              className="relative inline-flex shrink-0"
              style={{
                marginLeft: -10,
                zIndex: idx + 2,
              }}
            >
              <Gelato
                variant="scoop"
                tokens={gelatoTokensFromLogFlavour(f)}
                size={32}
                seed={f.id}
                className="flex shrink-0"
              />
            </span>
          ))}
        </span>
        {extra > 0 ? (
          <span className="z-[4] ml-1 shrink-0 self-end text-[11px] font-semibold tabular-nums text-[color:var(--text-secondary)]">
            +{extra}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="ml-1.5 inline-flex shrink-0 items-end align-middle">
      <span className="flex shrink-0 items-center">
        {visible.map((f, idx) => (
          <span
            key={f.id}
            className="relative inline-flex shrink-0"
            style={{
              marginLeft: idx === 0 ? 0 : -10,
              zIndex: idx + 1,
            }}
          >
            <Gelato
              variant="scoop"
              tokens={gelatoTokensFromLogFlavour(f)}
              size={32}
              seed={f.id}
              className="flex shrink-0"
            />
          </span>
        ))}
      </span>
      {extra > 0 ? (
        <span className="z-[4] ml-1 shrink-0 self-end text-[11px] font-semibold tabular-nums text-[color:var(--text-secondary)]">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

function LogDetailGelatoHero({ log }: { log: IceCreamLog }) {
  const flavours = log.log_flavours;
  if (flavours.length === 0) return null;

  const vessel = log.vessel;
  const labelClass =
    "max-w-[220px] text-center text-xs font-medium text-[color:var(--text-secondary)]";

  if (flavours.length === 1) {
    const f = flavours[0];
    const variant = vessel ?? "scoop";
    return (
      <div className="mb-4 flex flex-col items-center gap-2">
        <Gelato
          variant={variant}
          tokens={gelatoTokensFromLogFlavour(f)}
          size={240}
          seed={log.id}
          className="flex justify-center"
        />
        <p className={labelClass}>{getFlavourDisplayLabel(f)}</p>
      </div>
    );
  }

  if (vessel === "cup") {
    const [first, ...rest] = flavours;
    return (
      <div className="mb-4 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-2">
          <Gelato
            variant="cup"
            tokens={gelatoTokensFromLogFlavour(first)}
            size={240}
            seed={log.id}
            className="flex justify-center"
          />
          <p className={labelClass}>{getFlavourDisplayLabel(first)}</p>
        </div>
        {rest.length > 0 ? (
          <div className="flex w-full flex-wrap justify-center gap-x-5 gap-y-4">
            {rest.map((f) => (
              <div key={f.id} className="flex flex-col items-center gap-1.5">
                <Gelato
                  variant="scoop"
                  tokens={gelatoTokensFromLogFlavour(f)}
                  size={120}
                  seed={`${log.id}-${f.id}`}
                  className="flex justify-center"
                />
                <p className={`${labelClass} max-w-[140px]`}>{getFlavourDisplayLabel(f)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-4 flex w-full flex-wrap justify-center gap-x-5 gap-y-4">
      {flavours.map((f) => (
        <div key={f.id} className="flex flex-col items-center gap-1.5">
          <Gelato
            variant="scoop"
            tokens={gelatoTokensFromLogFlavour(f)}
            size={120}
            seed={`${log.id}-${f.id}`}
            className="flex justify-center"
          />
          <p className={`${labelClass} max-w-[140px]`}>{getFlavourDisplayLabel(f)}</p>
        </div>
      ))}
    </div>
  );
}

type DirectionsSheetProps = {
  log: IceCreamLog;
  onClose: () => void;
};

function DirectionsSheet({ log, onClose }: DirectionsSheetProps) {
  const lat = log.salon_lat!;
  const lng = log.salon_lng!;
  const placeId = log.salon_place_id;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${placeId ? `&destination_place_id=${placeId}` : ""}`;
  const appleUrl = `maps://maps.apple.com/?daddr=${lat},${lng}`;
  const [copied, setCopied] = useState(false);

  async function handleCopyLocation() {
    await navigator.clipboard.writeText(`${lat},${lng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl bg-[color:var(--surface-elevated)] p-6 shadow-2xl ring-1 ring-[color:var(--border-default)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            Get directions to {log.salon_name}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--surface-elevated-alt)] text-xs text-[color:var(--text-secondary)] transition hover:brightness-95 dark:hover:brightness-110"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={appleUrl}
            className="flex items-center gap-3 rounded-2xl bg-[color:var(--surface-elevated-alt)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)] transition hover:brightness-95 dark:hover:brightness-110"
          >
            <span className="text-lg">🗺️</span>
            Open in Apple Maps
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl bg-[color:var(--surface-elevated-alt)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)] transition hover:brightness-95 dark:hover:brightness-110"
          >
            <span className="text-lg">🌐</span>
            Open in Google Maps
          </a>
          <button
            type="button"
            onClick={() => void handleCopyLocation()}
            className="flex items-center gap-3 rounded-2xl bg-[color:var(--surface-elevated-alt)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)] transition hover:brightness-95 dark:hover:brightness-110"
          >
            <span className="text-lg">{copied ? "✅" : "📋"}</span>
            {copied ? "Copied!" : "Copy location"}
          </button>
        </div>
      </div>
    </div>
  );
}

type FeedCardProps = {
  log: IceCreamLog;
  /** Main feed hero layout; other surfaces use default. */
  layout?: "default" | "feed";
  currentUserId?: string;
  /** True if the viewer follows the log author (used for friends-only photos on public logs). */
  viewerFollowsAuthor?: boolean;
  /** Edit/delete controls only when true (e.g. your profile); hidden in the main feed. */
  showOwnerActions?: boolean;
  onDelete?: (id: string) => void;
  /** When true: always expanded, non-collapsible (used on the log detail page). */
  isDetailPage?: boolean;
};

export function FeedCard({
  log,
  layout = "default",
  currentUserId,
  viewerFollowsAuthor = false,
  showOwnerActions = false,
  onDelete,
  isDetailPage = false,
}: FeedCardProps) {
  const router = useRouter();
  const [feedExpanded, setFeedExpanded] = useState(false);
  const expanded = isDetailPage || feedExpanded;
  const [showDirections, setShowDirections] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [likeCount, setLikeCount] = useState(log.like_count ?? 0);
  const [liked, setLiked] = useState(log.user_has_liked ?? false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [avatarErrorLogId, setAvatarErrorLogId] = useState<string | null>(null);
  const [photoErrorLogId, setPhotoErrorLogId] = useState<string | null>(null);

  const { toast, showToast, dismissToast } = useToast();

  const isOwnLog = currentUserId != null && log.user_id === currentUserId;

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentUserId || likeLoading) return;
    setLikeLoading(true);
    const supabase = createClient();
    if (liked) {
      await supabase
        .from("log_likes")
        .delete()
        .eq("log_id", log.id)
        .eq("user_id", currentUserId);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from("log_likes")
        .insert({ log_id: log.id, user_id: currentUserId });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
    setLikeLoading(false);
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `https://gellog.app/log/${log.id}`;
    const title = `${log.profiles?.username ?? "Someone"} at ${log.salon_name} on Gellog`;
    const text = `Check out this gelato log on Gellog!`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        copyToClipboard(url);
        showToast("Link copied to clipboard!");
      }
    } catch {
      // user cancelled share — do nothing
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("ice_cream_logs").delete().eq("id", log.id);
    if (!error) {
      setShowDeleteConfirm(false);
      onDelete?.(log.id);
    }
    setDeleting(false);
  }

  const profile = log.profiles;
  const displayName = profile?.username ?? "Unknown user";
  const timeAgo = formatVisitDate(log.visited_at);
  const photoUrl = getPhotoUrl(log.photo_url);
  const photoVisibility = log.photo_visibility ?? "public";
  const hasPhotoAttached = Boolean(log.photo_url?.trim());
  const canSeePhoto =
    Boolean(photoUrl) &&
    (isOwnLog ||
      photoVisibility === "public" ||
      (photoVisibility === "friends" && viewerFollowsAuthor));
  const showPhotoPlaceholder = Boolean(photoUrl) && !canSeePhoto;
  const priceEuros = log.price_cents != null ? log.price_cents / 100 : null;
  const canSeePrice =
    priceEuros != null && (!log.hide_price || isOwnLog);
  const weather = formatWeather(log);
  const feedWeatherLine = formatFeedWeatherLine(log);
  const fullDate = formatFullDate(log.visited_at);
  const avatarImgError = avatarErrorLogId === log.id;
  const photoImgError = photoErrorLogId === log.id;

  const isFeedLayout = layout === "feed" && !isDetailPage;

  const ratingBorderClass =
    log.overall_rating >= 4
      ? "border-l-4 border-l-[color:var(--brand-primary)]"
      : log.overall_rating >= 3
        ? "border-l-4 border-l-[color:var(--brand-secondary)]"
        : "border-l-4 border-l-[color:var(--border-default)]";

  const numericFlavourRatings = log.log_flavours
    .map((f) => (typeof f.rating === "number" ? f.rating : null))
    .filter((v): v is number => v != null);

  const highestFlavourRating =
    numericFlavourRatings.length > 0 ? Math.max(...numericFlavourRatings) : null;

  const photoInitial = (log.salon_name?.trim() || "G").charAt(0).toUpperCase();

  const pillBase =
    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-[color:var(--text-inverse)]";

  /** Feed layout: only show a tall hero when there is a photo the viewer can see. */
  const feedHeroVisible = isFeedLayout && hasPhotoAttached && canSeePhoto && Boolean(photoUrl);

  return (
    <>
      <article
        className={`overflow-hidden rounded-3xl bg-[color:var(--surface-elevated)] shadow-sm ring-1 backdrop-blur-sm ${
          isFeedLayout ? "" : ratingBorderClass
        } ${
          isOwnLog
            ? "ring-[color:color-mix(in_srgb,var(--brand-primary)_45%,var(--border-default))]"
            : "ring-[color:var(--border-default)]"
        }`}
        onClick={() => {
          if (!isDetailPage) setFeedExpanded((v) => !v);
        }}
        style={{ cursor: isDetailPage ? "default" : "pointer" }}
      >
        {isFeedLayout ? (
          <>
            {feedHeroVisible && photoUrl ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color:var(--surface-elevated-alt)]">
                {!photoImgError ? (
                  <Image
                    src={photoUrl}
                    alt={`Photo from ${log.salon_name}`}
                    width={800}
                    height={600}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setPhotoErrorLogId(log.id)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[color:var(--brand-secondary)]">
                    <span className="text-3xl font-bold text-[color:var(--text-inverse)]">
                      {photoInitial}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
            {showPhotoPlaceholder ? (
              <div className="flex items-center gap-2 border-b border-[color:var(--border-default)] bg-[color:var(--surface-elevated-alt)] px-4 py-2.5">
                <span className="text-base" aria-hidden>
                  👥
                </span>
                <p className="text-xs font-medium text-[color:var(--text-secondary)]">
                  Photo visible to followers only
                </p>
              </div>
            ) : null}
            <div className="space-y-3 px-4 pb-3 pt-4">
              <div>
                <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[1.0625rem] font-semibold leading-snug tracking-tight text-[color:var(--text-primary)]">
                  {log.salon_place_id ? (
                    <Link
                      href={`/salon/${log.salon_place_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 text-[color:var(--text-primary)] decoration-[color:color-mix(in_srgb,var(--brand-secondary)_55%,var(--border-default))] decoration-2 underline-offset-4 transition-colors hover:text-[color:var(--brand-secondary)]"
                    >
                      {log.salon_name}
                    </Link>
                  ) : (
                    <span className="min-w-0">{log.salon_name}</span>
                  )}
                  <SalonInlineFlavourScoops
                    flavours={log.log_flavours}
                    vessel={log.vessel}
                    isDetailPage={isDetailPage}
                  />
                </h2>
                {log.salon_city?.trim() ? (
                  <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
                    {log.salon_city.trim()}
                  </p>
                ) : null}
              </div>

              {log.log_flavours.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: expanded ? "0fr" : "minmax(0, 1fr)",
                    transition: "grid-template-rows 280ms ease",
                  }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="flex flex-wrap gap-2">
                      {log.log_flavours.slice(0, FEED_COLLAPSED_FLAVOUR_CAP).map((flavour, i) => (
                        <span
                          key={flavour.id}
                          className={`${pillBase} ${
                            i % 2 === 0
                              ? "bg-[color:var(--brand-primary)]"
                              : "bg-[color:var(--brand-secondary)]"
                          }`}
                        >
                          {getFlavourDisplayLabel(flavour)}
                        </span>
                      ))}
                      {!expanded && log.log_flavours.length > FEED_COLLAPSED_FLAVOUR_CAP ? (
                        <span
                          className={`${pillBase} bg-[color:var(--surface-elevated-alt)] text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)]`}
                        >
                          +{log.log_flavours.length - FEED_COLLAPSED_FLAVOUR_CAP}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <RatingStarsDisplay value={log.overall_rating} size="lg" />
                </div>
                {canSeePrice && priceEuros != null ? (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[color:var(--text-primary)]">
                    €{priceEuros.toFixed(2)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[color:var(--surface-elevated-alt)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)]">
                  {log.visibility === "public" ? (
                    <>
                      <span aria-hidden>🌐</span>
                      Public
                    </>
                  ) : log.visibility === "friends" ? (
                    <>
                      <span aria-hidden>👥</span>
                      Friends
                    </>
                  ) : (
                    <>
                      <span aria-hidden>🔒</span>
                      Private
                    </>
                  )}
                </span>
                {feedWeatherLine ? (
                  <span className="inline-flex max-w-[min(12rem,100%)] items-center gap-0.5 truncate rounded-full bg-[color:var(--surface-elevated-alt)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)]">
                    <span className="shrink-0" aria-hidden>
                      ☀️
                    </span>
                    <span className="min-w-0 truncate">{feedWeatherLine}</span>
                  </span>
                ) : null}
                <span className="inline-flex items-center rounded-full bg-[color:var(--surface-elevated-alt)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)]">
                  {timeAgo}
                </span>
              </div>
            </div>
          </>
        ) : (
        <div className="p-4 pb-3">
          {isDetailPage && log.log_flavours.length > 0 ? <LogDetailGelatoHero log={log} /> : null}
          {/* Header: avatar · username · time ago [· edit/delete] */}
          <div className="mb-3 flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            {profile?.username ? (
              <Link
                href={isOwnLog ? "/icecream/profile" : `/profile/${profile.username}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2"
              >
                {profile.avatar_url && !avatarImgError ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    onError={() => setAvatarErrorLogId(log.id)}
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-secondary)] text-xs font-semibold text-[color:var(--text-inverse)]">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-[color:var(--text-primary)]">
                  {displayName}
                </span>
              </Link>
            ) : (
              <>
                {profile?.avatar_url && !avatarImgError ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    onError={() => setAvatarErrorLogId(log.id)}
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-secondary)] text-xs font-semibold text-[color:var(--text-inverse)]">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-[color:var(--text-primary)]">
                  {displayName}
                </span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo}</span>
            {log.visibility === "friends" ? (
              <span className="rounded-full bg-[color:var(--brand-secondary-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--brand-secondary)] ring-1 ring-[color:color-mix(in_srgb,var(--brand-secondary)_35%,var(--border-default))]">
                Friends
              </span>
            ) : log.visibility === "private" ? (
              <span className="rounded-full bg-[color:var(--surface-elevated-alt)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)]">
                Private
              </span>
            ) : null}
            {isOwnLog && showOwnerActions ? (
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/icecream/logs/edit/${log.id}`);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-tertiary)] transition hover:bg-[color:var(--surface-elevated-alt)] hover:text-[color:var(--text-primary)]"
                  aria-label="Edit log"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-tertiary)] transition hover:bg-[color:var(--color-error-surface)] hover:text-[color:var(--color-error)]"
                  aria-label="Delete log"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            ) : null}
          </div>

          {/* Salon name + inline flavour scoops + overall rating */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[1.0625rem] font-semibold leading-snug tracking-tight text-[color:var(--text-primary)]">
              {log.salon_place_id ? (
                <Link
                  href={`/salon/${log.salon_place_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-full bg-[color:var(--brand-secondary-bg)] px-3 py-1 text-[color:var(--brand-secondary)] ring-1 ring-[color:color-mix(in_srgb,var(--brand-secondary)_40%,var(--border-default))] transition hover:brightness-95 dark:hover:brightness-110"
                >
                  {log.salon_name}
                </Link>
              ) : (
                <span className="min-w-0 shrink-0">{log.salon_name}</span>
              )}
              <SalonInlineFlavourScoops
                flavours={log.log_flavours}
                vessel={log.vessel}
                isDetailPage={isDetailPage}
              />
            </h2>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <RatingStarsDisplay value={log.overall_rating} size="lg" />
              <span className="text-xs font-medium text-[color:var(--text-secondary)]">
                {log.overall_rating.toFixed(1)}/5
              </span>
            </div>
          </div>

          {/* Photo */}
          {canSeePhoto && photoUrl && !photoImgError ? (
            <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-2xl">
              <Image
                src={photoUrl}
                alt={`Photo from ${log.salon_name}`}
                width={400}
                height={300}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setPhotoErrorLogId(log.id)}
              />
            </div>
          ) : canSeePhoto && photoUrl && photoImgError ? (
            <div className="mt-3 flex aspect-[4/3] w-full flex-col items-center justify-center rounded-2xl bg-[color:var(--brand-secondary)]">
              <span className="text-3xl font-bold text-[color:var(--text-inverse)]">
                {photoInitial}
              </span>
            </div>
          ) : showPhotoPlaceholder ? (
            <div className="mt-3 flex aspect-[8/5] w-full flex-col items-center justify-center gap-1 rounded-2xl bg-[color:var(--surface-elevated-alt)] ring-1 ring-[color:var(--border-default)]">
              <span className="text-2xl" aria-hidden>
                👥
              </span>
              <p className="px-4 text-center text-xs font-medium text-[color:var(--text-secondary)]">
                Photo visible to followers only
              </p>
            </div>
          ) : null}

          {/* Flavour pills – name only in collapsed state, hidden when expanded */}
          {log.log_flavours.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateRows: expanded ? "0fr" : "minmax(0, 1fr)",
                transition: "grid-template-rows 280ms ease",
              }}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mt-3 flex flex-wrap gap-2 pt-0.5">
                  {log.log_flavours.map((flavour) => (
                    <span
                      key={flavour.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-elevated-alt)] px-2.5 py-1 text-xs font-semibold text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)]"
                    >
                      <Gelato
                        variant="scoop"
                        tokens={gelatoTokensFromLogFlavour(flavour)}
                        size={22}
                        seed={flavour.id}
                        className="flex shrink-0"
                      />
                      {getFlavourDisplayLabel(flavour)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        )}

        {/* ── EXPANDED: animated section ── */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: expanded ? "minmax(0, 1fr)" : "0fr",
            transition: "grid-template-rows 280ms ease",
          }}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-3 px-4 pb-2 pt-1">
              {/* Flavour pills with ratings + tags */}
              {log.log_flavours.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {log.log_flavours.map((flavour) => {
                    const isTop =
                      highestFlavourRating != null &&
                      typeof flavour.rating === "number" &&
                      flavour.rating === highestFlavourRating;

                    const flavourClass = isTop
                      ? "bg-[color:var(--brand-primary-bg)] text-[color:var(--brand-primary)] ring-[color:color-mix(in_srgb,var(--brand-primary)_35%,var(--border-default))]"
                      : "bg-[color:var(--surface-elevated-alt)] text-[color:var(--text-primary)] ring-[color:var(--border-default)]";

                    const advancedRatings = getAdvancedRatings(flavour);

                    return (
                      <div key={flavour.id} className="flex flex-col gap-1">
                        <div
                          className={`inline-flex flex-wrap items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ${flavourClass}`}
                        >
                          <Gelato
                            variant="scoop"
                            tokens={gelatoTokensFromLogFlavour(flavour)}
                            size={24}
                            seed={flavour.id}
                            className="flex shrink-0"
                          />
                          <span>{getFlavourDisplayLabel(flavour)}</span>
                          {flavour.rating != null ? (
                            <span className="flex items-center text-[10px] opacity-80">
                              <span className="mr-0.5">★</span>
                              {flavour.rating}
                            </span>
                          ) : null}
                          {flavour.tags && flavour.tags.length > 0
                            ? flavour.tags.map((tag) =>
                                DIETARY_TAG_SET.has(tag) ? (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-[color:var(--brand-secondary-bg)] px-1.5 py-0 text-[10px] font-medium text-[color:var(--brand-secondary)]"
                                  >
                                    {tag}
                                  </span>
                                ) : (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-[color:var(--brand-primary-bg)] px-1.5 py-0 text-[10px] font-medium text-[color:var(--brand-primary)]"
                                  >
                                    {tag}
                                  </span>
                                )
                              )
                            : null}
                        </div>
                        {advancedRatings.length > 0 ? (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-3">
                            {advancedRatings.map(({ label, value }) => (
                              <span
                                key={label}
                                className="flex items-center gap-1 text-[10px] text-[color:var(--text-secondary)]"
                              >
                                <span className="font-medium">{label}</span>
                                <RatingStarsDisplay value={value} size="sm" />
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Weather */}
              {weather ? (
                <p className="flex items-center gap-1 text-xs text-[color:var(--text-secondary)]">
                  <span>☀️</span>
                  {weather}
                </p>
              ) : null}

              {/* Price */}
              {canSeePrice && priceEuros != null ? (
                <p className="text-xs text-[color:var(--text-secondary)]">
                  <span className="font-medium text-[color:var(--brand-primary)]">
                    €{priceEuros.toFixed(2)}
                  </span>{" "}
                  paid
                </p>
              ) : null}

              {/* Notes */}
              {log.notes ? (
                <p className="rounded-2xl bg-[color:var(--surface-elevated-alt)] px-3 py-2 text-sm text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)]">
                  {log.notes}
                </p>
              ) : null}

              {/* Full date/time */}
              <p className="text-xs text-[color:var(--text-tertiary)]">{fullDate}</p>

              {/* Directions button */}
              {log.salon_lat != null && log.salon_lng != null ? (
                <div className="pb-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDirections(true);
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-[color:var(--brand-secondary-bg)] px-3 py-1.5 text-xs font-medium text-[color:var(--brand-secondary)] ring-1 ring-[color:color-mix(in_srgb,var(--brand-secondary)_35%,var(--border-default))] transition hover:brightness-95 dark:hover:brightness-110"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    Get directions
                  </button>
                </div>
              ) : null}

              {isFeedLayout ? (
                <div className="pb-1">
                  <button
                    type="button"
                    onClick={(e) => void handleShare(e)}
                    className="flex items-center gap-1.5 rounded-full bg-[color:var(--surface-elevated-alt)] px-3 py-1.5 text-xs font-medium text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)] transition hover:brightness-95 dark:hover:brightness-110"
                    aria-label="Share"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    Share
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {isFeedLayout ? (
          <div
            className="flex items-center justify-between gap-3 border-t border-[color:var(--border-default)] px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1">
              {profile?.username ? (
                <Link
                  href={isOwnLog ? "/icecream/profile" : `/profile/${profile.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex min-w-0 items-center gap-2"
                >
                  {profile.avatar_url && !avatarImgError ? (
                    <Image
                      src={profile.avatar_url}
                      alt={displayName}
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                      loading="lazy"
                      onError={() => setAvatarErrorLogId(log.id)}
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-secondary)] text-xs font-semibold text-[color:var(--text-inverse)]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                    {displayName}
                  </span>
                </Link>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  {profile?.avatar_url && !avatarImgError ? (
                    <Image
                      src={profile.avatar_url}
                      alt={displayName}
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                      loading="lazy"
                      onError={() => setAvatarErrorLogId(log.id)}
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-secondary)] text-xs font-semibold text-[color:var(--text-inverse)]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                    {displayName}
                  </span>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={(e) => void handleLike(e)}
                disabled={!currentUserId || likeLoading}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-full px-2 py-2 text-xs font-medium transition hover:bg-[color:var(--surface-elevated-alt)] disabled:cursor-default"
                style={{ color: liked ? "var(--brand-primary)" : "var(--text-secondary)" }}
                aria-label={liked ? "Unlike" : "Like"}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill={liked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {likeCount > 0 ? <span>{likeCount}</span> : null}
              </button>
              <Link
                href={isDetailPage ? "#comments" : `/log/${log.id}#comments`}
                onClick={(e) => e.stopPropagation()}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-full px-2 py-2 text-xs font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--surface-elevated-alt)]"
                aria-label="Comments"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {(log.comment_count ?? 0) > 0 ? <span>{log.comment_count}</span> : null}
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-3 items-center border-t border-[color:var(--border-default)] px-2 py-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Like */}
            <button
              type="button"
              onClick={(e) => void handleLike(e)}
              disabled={!currentUserId || likeLoading}
              className="mx-auto flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition hover:bg-[color:var(--surface-elevated-alt)] disabled:cursor-default"
              style={{ color: liked ? "var(--brand-primary)" : "var(--text-secondary)" }}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={liked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Comments */}
            <Link
              href={isDetailPage ? "#comments" : `/log/${log.id}#comments`}
              onClick={(e) => e.stopPropagation()}
              className="mx-auto flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition hover:bg-[color:var(--surface-elevated-alt)]"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Comments"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {(log.comment_count ?? 0) > 0 && <span>{log.comment_count}</span>}
            </Link>

            {/* Share */}
            <button
              type="button"
              onClick={(e) => void handleShare(e)}
              className="mx-auto flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition hover:bg-[color:var(--surface-elevated-alt)]"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Share"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
          </div>
        )}

        {!isDetailPage ? (
          <div
            className="flex items-center justify-center gap-1 py-2 text-[10px] font-medium text-[color:var(--text-tertiary)]"
            aria-hidden
          >
            {expanded ? (
              <>
                <span>▲</span>
                <span>less</span>
              </>
            ) : (
              <>
                <span>▼</span>
                <span>more</span>
              </>
            )}
          </div>
        ) : null}
      </article>

      {toast && (
        <Toast key={toast.id} message={toast.message} onDismiss={dismissToast} />
      )}

      {showDirections && log.salon_lat != null && log.salon_lng != null ? (
        <DirectionsSheet log={log} onClose={() => setShowDirections(false)} />
      ) : null}

      {showDeleteConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="absolute inset-0 bg-[color:var(--color-backdrop)]" />
          <div
            className="relative w-full max-w-sm rounded-3xl bg-[color:var(--surface-elevated)] p-6 shadow-2xl ring-1 ring-[color:var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Delete this log?
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
              Are you sure you want to delete this log? This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-full bg-[color:var(--surface-elevated-alt)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)] transition hover:brightness-95 dark:hover:brightness-110"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex-1 rounded-full bg-[color:var(--color-error)] px-4 py-2 text-sm font-semibold text-[color:var(--text-inverse)] transition hover:brightness-110 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
