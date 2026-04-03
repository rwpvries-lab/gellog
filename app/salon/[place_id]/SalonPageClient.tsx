"use client";

import { createClient } from "@/src/lib/supabase/client";
import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { SalonShareButton } from "./SalonShareButton";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

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
};

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
  vessel,
  price_paid,
  weather_temp,
  weather_condition,
  visibility,
  photo_visibility,
  price_hidden_from_others,
  profiles (
    id,
    username,
    avatar_url
  ),
  log_flavours (
    id,
    flavour_name,
    rating,
    tags,
    rating_texture,
    rating_originality,
    rating_intensity,
    rating_presentation
  )
`;

function SalonPageSkeleton() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-5 animate-pulse rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center justify-between gap-3">
          <div className="h-7 flex-1 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-9 w-16 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>

      <div className="mb-5 animate-pulse rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mb-3 h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mb-4 flex gap-6">
          <div className="h-12 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-12 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-7 w-24 rounded-full bg-zinc-200 dark:bg-zinc-700"
            />
          ))}
        </div>
      </div>

      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-zinc-200 px-1 dark:bg-zinc-700" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <div className="border-l-4 border-l-zinc-200 p-3 dark:border-l-zinc-700">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <div className="mb-2 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="aspect-[8/5] w-full rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

type Props = { placeId: string };

export function SalonPageClient({ placeId }: Props) {
  const [loading, setLoading] = useState(true);
  const [salonNotFound, setSalonNotFound] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [allLogs, setAllLogs] = useState<IceCreamLog[]>([]);
  const [salonProfile, setSalonProfile] = useState<SalonProfile | null>(null);
  const [emptyPlaceName, setEmptyPlaceName] = useState<string | null>(null);
  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(
    new Set(),
  );

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

      const [{ data: logsData }, { data: profileRow }] = await Promise.all([
        supabase
          .from("ice_cream_logs")
          .select(FEED_FIELDS)
          .eq("salon_place_id", placeId)
          .eq("visibility", "public")
          .order("visited_at", { ascending: false }),
        supabase.from("salon_profiles").select("*").eq("place_id", placeId).maybeSingle<SalonProfile>(),
      ]);

      if (cancelled) return;

      const logs = (logsData ?? []) as unknown as IceCreamLog[];
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
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [placeId]);

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
      <main className="mx-auto max-w-lg px-4 py-8">
        {isOwner && (
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-teal-50 px-4 py-3 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800">
            <span className="text-sm text-teal-800 dark:text-teal-300">
              You manage this salon
            </span>
            <Link
              href={`/salon/${placeId}/dashboard`}
              className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
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

        <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="mb-1 text-3xl">🍦</p>
          <p className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            No visits logged yet
          </p>
          <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Be the first to log a scoop here!
          </p>
          <Link
            href={`/icecream/logs/new?place_id=${encodeURIComponent(placeId)}&salon_name=${encodeURIComponent(placeName)}`}
            className="inline-block rounded-2xl bg-teal-500 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Log a visit →
          </Link>
        </div>
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
    <main className="mx-auto max-w-lg px-4 py-8">
      {isOwner && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-teal-50 px-4 py-3 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800">
          <span className="text-sm text-teal-800 dark:text-teal-300">
            You manage this salon
          </span>
          <Link
            href={`/salon/${placeId}/dashboard`}
            className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
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
        {isClaimed && salonProfile?.logo_url && (
          <div className="mb-4 flex justify-center">
            <Image
              src={salonProfile.logo_url}
              alt={displayName}
              width={80}
              height={80}
              className="rounded-2xl object-cover ring-1 ring-zinc-100 dark:ring-zinc-800"
            />
          </div>
        )}

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
                className="text-teal-700 hover:underline dark:text-teal-400"
              >
                {salonProfile.phone}
              </a>
            )}
            {salonProfile?.website && (
              <a
                href={salonProfile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:underline dark:text-teal-400"
              >
                {salonProfile.website}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="mb-5 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
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
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {name}{" "}
                  <span className="text-zinc-400 dark:text-zinc-500">
                    ×{count}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
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
    </main>
  );
}
