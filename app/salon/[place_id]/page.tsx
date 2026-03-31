import { createClient } from "@/src/lib/supabase/server";
import { FeedCard, type IceCreamLog } from "@/src/components/FeedCard";
import { SalonShareButton } from "./SalonShareButton";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function SalonPage({
  params,
}: {
  params: Promise<{ place_id: string }>;
}) {
  const { place_id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // All public logs for this salon (for stats + recent feed)
  const { data: logsData } = await supabase
    .from("ice_cream_logs")
    .select(FEED_FIELDS)
    .eq("salon_place_id", place_id)
    .eq("visibility", "public")
    .order("visited_at", { ascending: false });

  const allLogs = (logsData ?? []) as unknown as IceCreamLog[];

  // Fetch salon profile (may not exist yet)
  let { data: salonProfile } = await supabase
    .from("salon_profiles")
    .select("*")
    .eq("place_id", place_id)
    .maybeSingle<SalonProfile>();

  // === Undiscovered salon (no logs yet) ===
  if (allLogs.length === 0) {
    // Try Google Places to verify the place exists and get its name
    const key =
      process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    let placeName: string | null = null;

    if (key) {
      try {
        const url = new URL(
          "https://maps.googleapis.com/maps/api/place/details/json",
        );
        url.searchParams.set("place_id", place_id);
        url.searchParams.set("fields", "name");
        url.searchParams.set("key", key);
        const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
        const data = (await res.json()) as { result?: { name?: string } };
        placeName = data.result?.name ?? null;
      } catch {
        // fall through to notFound
      }
    }

    if (!placeName) notFound();

    const isClaimed = salonProfile?.is_claimed ?? false;
    const isOwner = user != null && salonProfile?.owner_id === user.id;

    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        {isOwner && (
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-teal-50 px-4 py-3 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800">
            <span className="text-sm text-teal-800 dark:text-teal-300">
              You manage this salon
            </span>
            <Link
              href={`/salon/${place_id}/dashboard`}
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
              href={`/salon/${place_id}/claim`}
              className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
            >
              Claim this page →
            </Link>
          </div>
        )}

        {/* Header card */}
        <div className="mb-5 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {placeName}
          </h1>
        </div>

        {/* Empty state */}
        <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="mb-1 text-3xl">🍦</p>
          <p className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            No visits logged yet
          </p>
          <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Be the first to log a scoop here!
          </p>
          <Link
            href={`/icecream/logs/new?place_id=${encodeURIComponent(place_id)}&salon_name=${encodeURIComponent(placeName)}`}
            className="inline-block rounded-2xl bg-teal-500 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Log a visit →
          </Link>
        </div>
      </main>
    );
  }

  // Auto-create unclaimed profile from most recent log
  if (!salonProfile) {
    // Lightweight query for address/city (not in IceCreamLog type)
    const { data: locationData } = await supabase
      .from("ice_cream_logs")
      .select("salon_name, salon_lat, salon_lng")
      .eq("salon_place_id", place_id)
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        salon_name: string;
        salon_lat: number | null;
        salon_lng: number | null;
      }>();

    if (locationData) {
      const { data: created } = await supabase
        .from("salon_profiles")
        .upsert(
          {
            place_id,
            is_claimed: false,
            salon_name: locationData.salon_name,
            salon_lat: locationData.salon_lat,
            salon_lng: locationData.salon_lng,
          },
          { onConflict: "place_id" },
        )
        .select()
        .maybeSingle<SalonProfile>();
      salonProfile = created;
    }
  }

  // Community stats
  const totalVisits = allLogs.length;
  const avgRating =
    allLogs.reduce((s, l) => s + l.overall_rating, 0) / totalVisits;

  const flavourCounts: Record<string, number> = {};
  for (const log of allLogs) {
    for (const f of log.log_flavours) {
      flavourCounts[f.flavour_name] =
        (flavourCounts[f.flavour_name] ?? 0) + 1;
    }
  }
  const topFlavours = Object.entries(flavourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recentLogs = allLogs.slice(0, 10);
  const authorIds = [...new Set(recentLogs.map((l) => l.user_id))];
  let followingAuthorIds = new Set<string>();
  if (user && authorIds.length > 0) {
    const { data: friendRows } = await supabase
      .from("friendships")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", authorIds);
    followingAuthorIds = new Set(
      (friendRows ?? []).map((r) => r.following_id),
    );
  }
  const isClaimed = salonProfile?.is_claimed ?? false;
  const isOwner = user != null && salonProfile?.owner_id === user.id;
  const displayName = salonProfile?.salon_name ?? allLogs[0].salon_name;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      {/* Owner dashboard button */}
      {isOwner && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-teal-50 px-4 py-3 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800">
          <span className="text-sm text-teal-800 dark:text-teal-300">
            You manage this salon
          </span>
          <Link
            href={`/salon/${place_id}/dashboard`}
            className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            Go to dashboard →
          </Link>
        </div>
      )}

      {/* Claim banner */}
      {!isClaimed && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800">
          <span className="text-sm text-amber-800 dark:text-amber-300">
            Is this your salon?
          </span>
          <Link
            href={`/salon/${place_id}/claim`}
            className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
          >
            Claim this page →
          </Link>
        </div>
      )}

      {/* Header card */}
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
            placeId={place_id}
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

      {/* Community stats */}
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

      {/* Recent logs */}
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Recent visits
      </h2>
      <div className="flex flex-col gap-4">
        {recentLogs.map((log) => (
          <FeedCard
            key={log.id}
            log={log}
            currentUserId={user?.id}
            viewerFollowsAuthor={followingAuthorIds.has(log.user_id)}
          />
        ))}
      </div>
    </main>
  );
}
