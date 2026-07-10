"use client";

import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { PublicBanner, PUBLIC_BANNER_LAYOUT_PX } from "@/src/components/PublicBanner";
import { PlaceholderScoop } from "@/src/components/Gelato/PlaceholderScoop";
import { Vitrine, type VitrineFlavour } from "@/src/components/Gelato/variants/Vitrine";
import { gelatoTokensFromNullableTokens } from "@/src/lib/gelato-tokens";
import { SalonHoursAndPeak } from "./SalonHoursAndPeak";
import { SalonShareButton } from "./SalonShareButton";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export type SalonProfile = {
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
export type SalonVitrineResolvedRow = {
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
  // Show the flavour name the salon owner actually typed — not the canonical
  // (often Dutch) name. Previously this preferred `canonical_name_nl`, which
  // rendered e.g. "Banaan (Banana)" for an owner who typed "Banana", looking
  // like an unwanted auto-translation of their own board.
  const displayName =
    row.input_name?.trim() ||
    row.canonical_name_nl?.trim() ||
    row.canonical_name_en?.trim() ||
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

type Props = {
  placeId: string;
  userId: string | null;
  allLogs: IceCreamLog[];
  salonProfile: SalonProfile | null;
  emptyPlaceName: string | null;
  followingAuthorIds: string[];
  vitrineResolvedRows: SalonVitrineResolvedRow[];
};

export function SalonPageClient({
  placeId,
  userId,
  allLogs,
  salonProfile,
  emptyPlaceName,
  followingAuthorIds,
  vitrineResolvedRows,
}: Props) {
  const router = useRouter();
  const followingSet = useMemo(() => new Set(followingAuthorIds), [followingAuthorIds]);
  const [failedSalonLogoUrl, setFailedSalonLogoUrl] = useState<string | null>(null);

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

  const isClaimed = salonProfile?.is_claimed ?? false;
  const isOwner = userId != null && salonProfile?.owner_id === userId;

  // ── Empty salon (no visits) ──
  if (allLogs.length === 0 && emptyPlaceName) {
    const placeName = emptyPlaceName;
    return (
      <main
        className="mx-auto max-w-lg px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))]"
        style={userId == null ? { paddingBottom: PUBLIC_BANNER_LAYOUT_PX + 32 } : undefined}
      >
        {isOwner && (
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
            <span className="text-sm text-[color:var(--text-primary)]">
              You manage this salon
            </span>
            <Link
              href={`/salon/${placeId}/dashboard`}
              className="pressable rounded-lg text-sm font-semibold text-[color:var(--brand-primary)] hover:underline"
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
              className="pressable rounded-lg text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
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

        <SalonHoursAndPeak placeId={placeId} isOwner={isOwner} showPeak={false} />

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
      // Salon content (description, flavour names) is the owner's own wording —
      // opt out of WKWebView/Safari auto-translation so it isn't distorted.
      translate="no"
      className="notranslate mx-auto max-w-lg px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))]"
      style={userId == null ? { paddingBottom: PUBLIC_BANNER_LAYOUT_PX + 32 } : undefined}
    >
      {isOwner && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
          <span className="text-sm text-[color:var(--text-primary)]">
            You manage this salon
          </span>
          <Link
            href={`/salon/${placeId}/dashboard`}
            className="pressable rounded-lg text-sm font-semibold text-[color:var(--brand-primary)] hover:underline"
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

      <SalonHoursAndPeak placeId={placeId} isOwner={isOwner} showPeak />

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
            viewerFollowsAuthor={followingSet.has(log.user_id)}
          />
        ))}
      </div>
      {userId == null ? <PublicBanner variant="salon" salonName={displayName} /> : null}
    </main>
  );
}
