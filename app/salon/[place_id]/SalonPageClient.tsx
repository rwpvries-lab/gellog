"use client";

import { createClient } from "@/src/lib/supabase/client";
import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { PublicBanner, PUBLIC_BANNER_LAYOUT_PX } from "@/src/components/PublicBanner";
import { PlaceholderScoop } from "@/src/components/Gelato/PlaceholderScoop";
import { Vitrine, type VitrineFlavour } from "@/src/components/Gelato/variants/Vitrine";
import { gelatoTokensFromNullableTokens } from "@/src/lib/gelato-tokens";
import {
  applyResolvedFlavoursToLogRow,
  LOG_FLAVOURS_RESOLVED_SELECT,
} from "@/src/lib/log-flavours-resolved";
import { OpeningHoursCard } from "@/src/components/OpeningHoursCard";
import { type WeekHours } from "@/src/lib/opening-hours";
import type { PeakGridPayload } from "@/src/lib/salonPeakGrid";
import { SalonShareButton } from "./SalonShareButton";
import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SalonProfile = {
  id: string;
  place_id: string;
  is_claimed: boolean;
  owner_id: string | null;
  salon_name: string;
  salon_lat: number | null;
  salon_lng: number | null;
  logo_url: string | null;
  bio: string | null;
  phone: string | null;
  website: string | null;
  vitrine_enabled?: boolean | null;
};

/** Row from `vitrine_flavours_resolved` (matches view column names). */
type SalonVitrineResolvedRow = {
  vitrine_flavour_id: string;
  salon_place_id: string;
  input_name: string;
  legacy_colour: string | null;
  is_visible: boolean;
  display_started_at: string | null;
  total_display_seconds: number | null;
  flavour_id: string | null;
  flavour_slug: string | null;
  canonical_name_nl: string | null;
  canonical_name_en: string | null;
  canonical_name_it: string | null;
  base_token: string | null;
  drizzle_token: string | null;
  crumble_token: string | null;
  category: string | null;
  is_exclusive: boolean;
  is_brand_new: boolean;
  is_vegan: boolean;
};

function mapVitrineResolvedToFlavour(row: SalonVitrineResolvedRow): VitrineFlavour {
  const displayName =
    row.canonical_name_nl?.trim() ||
    row.canonical_name_en?.trim() ||
    row.input_name?.trim() ||
    "Flavour";
  return {
    id: row.vitrine_flavour_id,
    displayName,
    inputName: row.input_name,
    tokens: gelatoTokensFromNullableTokens(
      row.base_token,
      row.drizzle_token,
      row.crumble_token,
    ),
    isExclusive: row.is_exclusive,
    isBrandNew: row.is_brand_new,
    isVegan: row.is_vegan,
  };
}

const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;

function publicSalonLogoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!supabaseBase) return path;
  return `${supabaseBase}/storage/v1/object/public/salon-logos/${path}`;
}

const FEED_FIELDS = `
  id,
  user_id,
  salon_name,
  salon_lat,
  salon_lng,
  salon_place_id,
  overall_rating,
  notes,
  photo_url,
  visited_at,
  created_at,
  vessel,
  price_cents,
  weather_temp_c,
  weather_condition,
  visibility,
  photo_visibility,
  hide_price,
  profiles (
    id,
    username,
    avatar_url
  ),
${LOG_FLAVOURS_RESOLVED_SELECT}
`;

function peakChips(data: PeakGridPayload): { quietHour: number | null; busyHour: number | null } {
  const todayRow = (new Date().getDay() + 6) % 7;
  const row = data.grid[todayRow];
  if (!row) return { quietHour: null, busyHour: null };

  const open = row
    .map((score, idx) => ({ score, hour: 9 + idx }))
    .filter((c): c is { score: number; hour: number } => c.score !== null);

  if (open.length === 0) return { quietHour: null, busyHour: null };

  const quietHour = open.reduce((a, b) => (a.score <= b.score ? a : b)).hour;
  const busyHour = open.reduce((a, b) => (a.score >= b.score ? a : b)).hour;
  return { quietHour, busyHour };
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`;
}

function SalonPageSkeleton() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-5 animate-pulse rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="flex items-center justify-between gap-3">
          <div className="h-7 flex-1 rounded-lg bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-9 w-16 shrink-0 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-3 w-2/3 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
      </div>

      <div className="mb-5 animate-pulse rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mb-3 h-3 w-28 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="mb-4 flex gap-6">
          <div className="h-12 w-16 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-12 w-16 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-7 w-24 rounded-full bg-[#F0E4CF] dark:bg-zinc-700"
            />
          ))}
        </div>
      </div>

      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-[#F0E4CF] px-1 dark:bg-zinc-700" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <div className="border-l-4 border-l-zinc-200 p-3 dark:border-l-zinc-700">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
                <div className="h-3 w-24 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              </div>
              <div className="mb-2 h-4 w-3/4 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              <div className="aspect-[4/3] w-full rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

type Props = { placeId: string };

export function SalonPageClient({ placeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salonNotFound, setSalonNotFound] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [allLogs, setAllLogs] = useState<IceCreamLog[]>([]);
  const [salonProfile, setSalonProfile] = useState<SalonProfile | null>(null);
  const [emptyPlaceName, setEmptyPlaceName] = useState<string | null>(null);
  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(
    new Set(),
  );
  const [vitrineResolvedRows, setVitrineResolvedRows] = useState<SalonVitrineResolvedRow[]>([]);
  const [failedSalonLogoUrl, setFailedSalonLogoUrl] = useState<string | null>(null);
  const [hours, setHours] = useState<WeekHours | null>(null);
  const [peakData, setPeakData] = useState<PeakGridPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setSalonNotFound(false);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);

      const vitrineSelect = supabase
        .from("vitrine_flavours_resolved")
        .select("*")
        .eq("salon_place_id", placeId)
        .eq("is_visible", true)
        .order("input_name", { ascending: true });

      const [{ data: logsData }, { data: profileRow }, { data: vitrineData }, hoursData, peakResult] =
        await Promise.all([
          supabase
            .from("ice_cream_logs")
            .select(FEED_FIELDS)
            .eq("salon_place_id", placeId)
            .eq("visibility", "public")
            .order("visited_at", { ascending: false }),
          supabase
            .from("salon_profiles")
            .select("*")
            .eq("place_id", placeId)
            .maybeSingle<SalonProfile>(),
          vitrineSelect,
          fetch(`/api/salon/${encodeURIComponent(placeId)}/hours`)
            .then((r) =>
              r.ok
                ? (r.json() as Promise<{ hours: WeekHours | null }>)
                : null,
            )
            .catch(() => null),
          fetch(`/api/salon/${encodeURIComponent(placeId)}/peak`)
            .then((r) => (r.ok ? (r.json() as Promise<PeakGridPayload>) : null))
            .catch(() => null),
        ]);

      if (cancelled) return;

      const logs = ((logsData ?? []) as unknown as Record<string, unknown>[]).map((row) =>
        applyResolvedFlavoursToLogRow(row),
      ) as unknown as IceCreamLog[];
      let profile = profileRow ?? null;

      if (logs.length === 0) {
        const res = await fetch(
          `/api/places/lookup-name?place_id=${encodeURIComponent(placeId)}`,
        );
        if (!res.ok) {
          setSalonNotFound(true);
          setLoading(false);
          return;
        }
        const { name } = (await res.json()) as { name: string };
        setEmptyPlaceName(name);
        setAllLogs([]);
        setSalonProfile(profile);
        setFollowingAuthorIds(new Set());
        setVitrineResolvedRows((vitrineData ?? []) as SalonVitrineResolvedRow[]);
        setHours(hoursData?.hours ?? null);
        setPeakData(peakResult);
        setLoading(false);
        return;
      }

      if (!profile) {
        const first = logs[0];
        if (user) {
          const { data: created } = await supabase
            .from("salon_profiles")
            .upsert(
              {
                place_id: placeId,
                is_claimed: false,
                salon_name: first.salon_name,
                salon_lat: first.salon_lat,
                salon_lng: first.salon_lng,
              },
              { onConflict: "place_id" },
            )
            .select()
            .maybeSingle<SalonProfile>();
          profile = created ?? null;
        }
      }

      const recentLogs = logs.slice(0, 10);
      const authorIds = [...new Set(recentLogs.map((l) => l.user_id))];
      let following = new Set<string>();
      if (user && authorIds.length > 0) {
        const { data: friendRows } = await supabase
          .from("friendships")
          .select("following_id")
          .eq("follower_id", user.id)
          .in("following_id", authorIds);
        following = new Set((friendRows ?? []).map((r) => r.following_id));
      }

      if (cancelled) return;
      setAllLogs(logs);
      setSalonProfile(profile);
      setFollowingAuthorIds(following);
      setEmptyPlaceName(null);
      setVitrineResolvedRows((vitrineData ?? []) as SalonVitrineResolvedRow[]);
      setHours(hoursData?.hours ?? null);
      setPeakData(peakResult);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  const handleVitrineTubClick = useCallback(
    (vitrineFlavourId: string) => {
      const vf = vitrineResolvedRows.find((v) => v.vitrine_flavour_id === vitrineFlavourId);
      if (!vf) return;
      if (!userId) {
        router.push("/signup");
        return;
      }
      // input_name is what the salon uses on the board; log form pre-fills from `flavour`.
      router.push(
        `/icecream/logs/new?salon_place_id=${encodeURIComponent(placeId)}&flavour=${encodeURIComponent(vf.input_name)}`,
      );
    },
    [placeId, router, userId, vitrineResolvedRows],
  );

  const vitrineFlavours = vitrineResolvedRows.map(mapVitrineResolvedToFlavour);
  const vitrineSectionEnabled = salonProfile?.vitrine_enabled !== false;

  if (loading) {
    return <SalonPageSkeleton />;
  }

  if (salonNotFound) {
    notFound();
  }

  const isClaimed = salonProfile?.is_claimed ?? false;
  const isOwner = userId != null && salonProfile?.owner_id === userId;

  // ── Empty salon (no visits) ──
  if (allLogs.length === 0 && emptyPlaceName) {
    const placeName = emptyPlaceName;
    return (
      <main
        className="mx-auto max-w-lg px-4 py-8"
        style={userId == null ? { paddingBottom: PUBLIC_BANNER_LAYOUT_PX + 32 } : undefined}
      >
        {isOwner && (
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
            <span className="text-sm text-[color:var(--text-primary)]">
              You manage this salon
            </span>
            <Link
              href={`/salon/${placeId}/dashboard`}
              className="text-sm font-semibold text-[color:var(--brand-primary)] hover:underline"
            >
              Go to dashboard →
            </Link>
          </div>
        )}

        {!isClaimed && (
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800">
            <span className="text-sm text-amber-800 dark:text-amber-300">
              Is this your salon?
            </span>
            <Link
              href={`/salon/${placeId}/claim`}
              className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
            >
              Claim this page →
            </Link>
          </div>
        )}

        <div className="mb-5 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {placeName}
          </h1>
        </div>

        {vitrineSectionEnabled ? (
          <div className="mb-5 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              On display today
            </h2>
            <Vitrine
              flavours={vitrineFlavours}
              seed={placeId}
              narrow
            />
          </div>
        ) : null}

        {hours && (
          <div className="mb-5">
            <OpeningHoursCard hours={hours} isOwner={isOwner} placeId={placeId} />
          </div>
        )}

        <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="mb-2 flex justify-center" aria-hidden>
            <PlaceholderScoop size={56} seed={`salon-empty-${placeId}`} />
          </div>
          <p className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            No visits logged yet
          </p>
          <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Be the first to log a scoop here!
          </p>
          <Link
            href={
              userId
                ? `/icecream/logs/new?place_id=${encodeURIComponent(placeId)}&salon_name=${encodeURIComponent(placeName)}`
                : "/signup"
            }
            className="inline-block rounded-2xl bg-[color:var(--brand-primary)] px-6 py-3 text-sm font-semibold text-[color:var(--text-inverse)] hover:bg-[color:var(--brand-primary-hover)]"
          >
            Log a visit →
          </Link>
        </div>
        {userId == null ? <PublicBanner variant="salon" salonName={placeName} /> : null}
      </main>
    );
  }

  const totalVisits = allLogs.length;
  const avgRating =
    allLogs.reduce((s, l) => s + l.overall_rating, 0) / totalVisits;

  const flavourCounts: Record<string, number> = {};
  for (const log of allLogs) {
    for (const f of log.log_flavours) {
      flavourCounts[f.flavour_name] = (flavourCounts[f.flavour_name] ?? 0) + 1;
    }
  }
  const topFlavours = Object.entries(flavourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const displayName = salonProfile?.salon_name ?? allLogs[0].salon_name;
  const recentLogs = allLogs.slice(0, 10);

  return (
    <main
      className="mx-auto max-w-lg px-4 py-8"
      style={userId == null ? { paddingBottom: PUBLIC_BANNER_LAYOUT_PX + 32 } : undefined}
    >
      {isOwner && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
          <span className="text-sm text-[color:var(--text-primary)]">
            You manage this salon
          </span>
          <Link
            href={`/salon/${placeId}/dashboard`}
            className="text-sm font-semibold text-[color:var(--brand-primary)] hover:underline"
          >
            Go to dashboard →
          </Link>
        </div>
      )}

      {!isClaimed && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800">
          <span className="text-sm text-amber-800 dark:text-amber-300">
            Is this your salon?
          </span>
          <Link
            href={`/salon/${placeId}/claim`}
            className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
          >
            Claim this page →
          </Link>
        </div>
      )}

      <div className="mb-5 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        {isClaimed && salonProfile?.logo_url ? (
          <div className="mb-4 flex justify-center">
            {(() => {
              const logoSrc = publicSalonLogoUrl(salonProfile.logo_url);
              const showLogo = logoSrc && failedSalonLogoUrl !== logoSrc;
              return showLogo ? (
                <Image
                  src={logoSrc}
                  alt={displayName}
                  width={60}
                  height={60}
                  className="rounded-2xl object-cover ring-1 ring-zinc-100 dark:ring-zinc-800"
                  loading="lazy"
                  onError={() => setFailedSalonLogoUrl(logoSrc)}
                />
              ) : (
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-[color:var(--color-teal)] text-lg font-semibold text-[color:var(--color-on-brand)] ring-1 ring-zinc-100 dark:ring-zinc-800">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              );
            })()}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {displayName}
          </h1>
          <SalonShareButton
            salonName={displayName}
            placeId={placeId}
            visitCount={totalVisits}
          />
        </div>

        {isClaimed && salonProfile?.bio && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {salonProfile.bio}
          </p>
        )}

        {isClaimed && (salonProfile?.phone ?? salonProfile?.website) && (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {salonProfile?.phone && (
              <a
                href={`tel:${salonProfile.phone}`}
                className="text-[color:var(--brand-primary)] hover:underline"
              >
                {salonProfile.phone}
              </a>
            )}
            {salonProfile?.website && (
              <a
                href={salonProfile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--brand-primary)] hover:underline"
              >
                {salonProfile.website}
              </a>
            )}
          </div>
        )}
      </div>

      {vitrineSectionEnabled ? (
        <div className="mb-5 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            On display today
          </h2>
          <Vitrine
            flavours={vitrineFlavours}
            seed={placeId}
            narrow
          />
        </div>
      ) : null}

      {hours && (
        <div className="mb-5">
          <OpeningHoursCard hours={hours} isOwner={isOwner} placeId={placeId} />
        </div>
      )}

      {peakData && peakData.total_count >= 20 && (() => {
        const { quietHour, busyHour } = peakChips(peakData);
        if (quietHour === null) return null;
        return (
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-primary-surface)] px-3 py-1.5 text-xs font-medium text-[color:var(--brand-primary)] ring-1 ring-[color:var(--brand-primary-muted)]">
              Quieter at {fmtHour(quietHour)} today
            </span>
            {busyHour !== null && busyHour !== quietHour && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800">
                Likely busy at {fmtHour(busyHour)}
              </span>
            )}
          </div>
        );
      })()}

      <div className="mb-5 rounded-3xl bg-[color:var(--surface-elevated)] px-6 py-5 shadow-sm ring-1 ring-[color:var(--border-default)]">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Community stats
        </h2>
        <div className="mb-4 flex gap-6">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {totalVisits}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              visits logged
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              avg rating
            </span>
          </div>
        </div>

        {topFlavours.length > 0 && (
          <>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Most popular flavours
            </p>
            <div className="flex flex-wrap gap-2">
              {topFlavours.map(([name, count]) => (
                <span
                  key={name}
                  className="rounded-full border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary-surface)] px-3 py-1 text-xs font-medium text-[color:var(--brand-primary)]"
                >
                  {name}{" "}
                  <span className="opacity-60">
                    ×{count}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--brand-primary-surface)] px-5 py-3.5 ring-1 ring-[color:var(--brand-primary-muted)]">
        <span className="text-sm font-medium text-[color:var(--text-primary)]">
          Been here?
        </span>
        <Link
          href={
            userId
              ? `/icecream/logs/new?place_id=${encodeURIComponent(placeId)}&salon_name=${encodeURIComponent(displayName)}`
              : `/signup`
          }
          className="rounded-2xl bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-semibold text-[color:var(--text-inverse)] transition hover:bg-[color:var(--brand-primary-hover)]"
        >
          Log a gelato here →
        </Link>
      </div>

      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Recent visits
      </h2>
      <div className="flex flex-col gap-4">
        {recentLogs.map((log) => (
          <FeedCard
            key={log.id}
            log={log}
            currentUserId={userId ?? undefined}
            viewerFollowsAuthor={followingAuthorIds.has(log.user_id)}
          />
        ))}
      </div>
      {userId == null ? <PublicBanner variant="salon" salonName={displayName} /> : null}
    </main>
  );
}
