'use client';

import { RatingStarsDisplay } from "@/app/components/RatingStars";
import { VesselIllustration, getFlavourColor } from "@/src/components/VesselIllustration";
import { Toast, useToast, copyToClipboard } from "@/src/components/Toast";
import { createClient } from "@/src/lib/supabase/client";
import { formatVisitDate } from "@/src/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DIETARY_TAG_SET = new Set(["Sugar-free", "Dairy-free", "Vegan", "Nut-free", "Gluten-free"]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export type LogFlavour = {
  id: string;
  flavour_name: string;
  rating: number | null;
  tags: string[] | null;
  rating_texture: number | null;
  rating_originality: number | null;
  rating_intensity: number | null;
  rating_presentation: number | null;
};

export type LogProfile = {
  username: string | null;
  avatar_url: string | null;
};

export type IceCreamLog = {
  id: string;
  user_id: string;
  salon_name: string;
  salon_lat: number | null;
  salon_lng: number | null;
  salon_place_id: string | null;
  overall_rating: number;
  notes: string | null;
  photo_url: string | null;
  visited_at: string;
  vessel: "cup" | "cone" | null;
  price_paid: number | null;
  weather_temp: number | null;
  weather_condition: string | null;
  weather_uv_index: number | null;
  visibility: "public" | "friends" | "private";
  photo_visibility?: "public" | "friends";
  price_hidden_from_others?: boolean;
  profiles: LogProfile | null;
  log_flavours: LogFlavour[];
  like_count?: number;
  user_has_liked?: boolean;
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
    log.weather_temp != null || (log.weather_condition?.trim().length ?? 0) > 0;
  if (!hasWeather) return null;

  const tempNumber =
    typeof log.weather_temp === "number"
      ? log.weather_temp
      : log.weather_temp != null
        ? Number(log.weather_temp)
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
        className="w-full rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Get directions to {log.salon_name}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={appleUrl}
            className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100 transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
          >
            <span className="text-lg">🗺️</span>
            Open in Apple Maps
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100 transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
          >
            <span className="text-lg">🌐</span>
            Open in Google Maps
          </a>
          <button
            type="button"
            onClick={() => void handleCopyLocation()}
            className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100 transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
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
  currentUserId?: string;
  /** True if the viewer follows the log author (used for friends-only photos on public logs). */
  viewerFollowsAuthor?: boolean;
  /** Edit/delete controls only when true (e.g. your profile); hidden in the main feed. */
  showOwnerActions?: boolean;
  onDelete?: (id: string) => void;
};

export function FeedCard({
  log,
  currentUserId,
  viewerFollowsAuthor = false,
  showOwnerActions = false,
  onDelete,
}: FeedCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [likeCount, setLikeCount] = useState(log.like_count ?? 0);
  const [liked, setLiked] = useState(log.user_has_liked ?? false);
  const [likeLoading, setLikeLoading] = useState(false);

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
  const canSeePhoto =
    Boolean(photoUrl) &&
    (isOwnLog ||
      photoVisibility === "public" ||
      (photoVisibility === "friends" && viewerFollowsAuthor));
  const showPhotoPlaceholder = Boolean(photoUrl) && !canSeePhoto;
  const pricePaid = log.price_paid;
  const canSeePrice =
    pricePaid != null && (!log.price_hidden_from_others || isOwnLog);
  const weather = formatWeather(log);
  const fullDate = formatFullDate(log.visited_at);

  const ratingBorderClass =
    log.overall_rating >= 4
      ? "border-l-4 border-l-orange-400 dark:border-l-orange-500"
      : log.overall_rating >= 3
        ? "border-l-4 border-l-teal-500 dark:border-l-teal-400"
        : "border-l-4 border-l-zinc-200 dark:border-l-zinc-700";

  const numericFlavourRatings = log.log_flavours
    .map((f) => (typeof f.rating === "number" ? f.rating : null))
    .filter((v): v is number => v != null);

  const highestFlavourRating =
    numericFlavourRatings.length > 0 ? Math.max(...numericFlavourRatings) : null;

  // Avatar colours
  const colours = ["#4D97D6", "#60B488", "#C13A2D", "#D02E2E", "#3531B7"];
  const avatarColour =
    colours[profile?.username ? profile.username.charCodeAt(0) % colours.length : 0];

  return (
    <>
      <article
        className={`overflow-hidden rounded-3xl bg-white shadow-sm backdrop-blur-sm dark:bg-zinc-900 ${ratingBorderClass} ${isOwnLog ? "ring-1 ring-orange-200 dark:ring-orange-900/50" : "ring-1 ring-zinc-100 dark:ring-zinc-800"}`}
        onClick={() => setExpanded((e) => !e)}
        style={{ cursor: "pointer" }}
      >
        {/* ── COLLAPSED: always visible ── */}
        <div className="p-3">
          {/* Header: avatar · username · time ago [· edit/delete] */}
          <div className="mb-2.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {profile?.username ? (
              <Link
                href={isOwnLog ? "/icecream/profile" : `/profile/${profile.username}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2"
              >
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    width={22}
                    height={22}
                    className="h-5.5 w-5.5 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                    style={{ backgroundColor: avatarColour }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {displayName}
                </span>
              </Link>
            ) : (
              <>
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    width={22}
                    height={22}
                    className="h-5.5 w-5.5 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                    style={{ backgroundColor: avatarColour }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {displayName}
                </span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo}</span>
            {log.visibility === "friends" ? (
              <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-600 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:ring-teal-800/50">
                Friends
              </span>
            ) : log.visibility === "private" ? (
              <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">
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
                  className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
                  className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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

          {/* Salon name + vessel + overall rating */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {log.salon_place_id ? (
                <Link
                  href={`/salon/${log.salon_place_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-teal-800 ring-1 ring-teal-100 transition hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60 dark:hover:bg-teal-900/50"
                >
                  {log.salon_name}
                </Link>
              ) : (
                log.salon_name
              )}
              {log.vessel ? (
                <span className="ml-1.5 inline-flex align-middle">
                  <VesselIllustration
                    vessel={log.vessel}
                    flavours={log.log_flavours.slice(0, 3).map((f, i) => ({
                      name: f.flavour_name,
                      colorHex: getFlavourColor(f.flavour_name, i),
                    }))}
                    size="small"
                  />
                </span>
              ) : null}
            </h2>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <RatingStarsDisplay value={log.overall_rating} size="lg" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {log.overall_rating.toFixed(1)}/5
              </span>
            </div>
          </div>

          {/* Photo */}
          {canSeePhoto && photoUrl ? (
            <div className="relative mt-2.5 aspect-[8/5] w-full overflow-hidden rounded-2xl">
              <Image
                src={photoUrl}
                alt={`Photo from ${log.salon_name}`}
                width={800}
                height={500}
                className="h-full w-full object-cover"
              />
            </div>
          ) : showPhotoPlaceholder ? (
            <div className="mt-2.5 flex aspect-[8/5] w-full flex-col items-center justify-center gap-1 rounded-2xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800/80 dark:ring-zinc-700">
              <span className="text-2xl" aria-hidden>
                👥
              </span>
              <p className="px-4 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Photo visible to followers only
              </p>
            </div>
          ) : null}

          {/* Flavour pills – name only in collapsed state, hidden when expanded */}
          {log.log_flavours.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateRows: expanded ? "0fr" : "1fr",
                transition: "grid-template-rows 280ms ease",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {log.log_flavours.map((flavour) => (
                    <span
                      key={flavour.id}
                      className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {flavour.flavour_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── EXPANDED: animated section ── */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: expanded ? "1fr" : "0fr",
            transition: "grid-template-rows 280ms ease",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            <div className="flex flex-col gap-3 px-3 pb-1">
              {/* Flavour pills with ratings + tags */}
              {log.log_flavours.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {log.log_flavours.map((flavour) => {
                    const isTop =
                      highestFlavourRating != null &&
                      typeof flavour.rating === "number" &&
                      flavour.rating === highestFlavourRating;

                    const flavourClass = isTop
                      ? "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-800/60"
                      : "bg-zinc-50 text-zinc-700 ring-zinc-100 dark:bg-zinc-900/70 dark:text-zinc-100 dark:ring-zinc-700";

                    const advancedRatings = getAdvancedRatings(flavour);

                    return (
                      <div key={flavour.id} className="flex flex-col gap-1">
                        <div
                          className={`inline-flex flex-wrap items-center gap-1 self-start rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ${flavourClass}`}
                        >
                          <span>{flavour.flavour_name}</span>
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
                                    className="rounded-full bg-teal-100 px-1.5 py-0 text-[10px] font-medium text-teal-700 dark:bg-teal-900/50 dark:text-teal-200"
                                  >
                                    {tag}
                                  </span>
                                ) : (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-orange-100 px-1.5 py-0 text-[10px] font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-200"
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
                                className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400"
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
                <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>☀️</span>
                  {weather}
                </p>
              ) : null}

              {/* Price */}
              {canSeePrice && pricePaid != null ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium text-orange-600 dark:text-orange-300">
                    €{pricePaid.toFixed(2)}
                  </span>{" "}
                  paid
                </p>
              ) : null}

              {/* Notes */}
              {log.notes ? (
                <p className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-100 dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-zinc-800">
                  {log.notes}
                </p>
              ) : null}

              {/* Full date/time */}
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{fullDate}</p>

              {/* Directions button */}
              {log.salon_lat != null && log.salon_lng != null ? (
                <div className="pb-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDirections(true);
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60 dark:hover:bg-teal-900/50"
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
            </div>
          </div>
        </div>

        {/* ── Action row: like · comment count · [spacer] · share ── */}
        <div
          className="flex items-center gap-3 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Like */}
          <button
            type="button"
            onClick={(e) => void handleLike(e)}
            disabled={!currentUserId || likeLoading}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition hover:bg-zinc-50 disabled:cursor-default dark:hover:bg-zinc-800"
            style={{ color: liked ? "var(--color-orange, #F97316)" : "var(--color-text-secondary)" }}
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Share */}
          <button
            type="button"
            onClick={(e) => void handleShare(e)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            style={{ color: "var(--color-text-secondary)" }}
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

        {/* ── Toggle label ── */}
        <div
          className="flex items-center justify-center gap-1 py-2 text-[10px] font-medium text-zinc-400 dark:text-zinc-500"
          aria-hidden="true"
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
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Delete this log?
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Are you sure you want to delete this log? This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
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
