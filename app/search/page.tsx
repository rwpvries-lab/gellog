'use client';

import { createClient } from "@/src/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FollowButton } from "@/app/profile/[username]/FollowButton";
import { autocompletePassesSalonFilter } from "@/src/lib/looksLikeIceCreamSalon";

function AvatarFill({ avatarUrl, displayName, initial }: { avatarUrl: string | null; displayName: string; initial: string }) {
  const [imgError, setImgError] = useState(false);
  return avatarUrl && !imgError ? (
    <Image src={avatarUrl} alt={displayName} fill className="object-cover" unoptimized onError={() => setImgError(true)} />
  ) : (
    <span className="flex h-full w-full items-center justify-center text-sm font-semibold">
      {initial}
    </span>
  );
}

type SearchProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  log_count: number;
};

type SalonResult = {
  place_id: string;
  salon_name: string;
  is_claimed: boolean;
  logo_url: string | null;
  visit_count: number;
  avg_rating: number;
};

type PlacesPrediction = {
  place_id: string;
  main_text: string;
  secondary_text: string;
};

type FollowStatus = Record<string, boolean>;

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"people" | "salons">("people");

  // People state
  const [results, setResults] = useState<SearchProfile[]>([]);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({});
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Salons state
  const [salonResults, setSalonResults] = useState<SalonResult[]>([]);
  const [placesResults, setPlacesResults] = useState<PlacesPrediction[]>([]);
  const [salonLoading, setSalonLoading] = useState(false);
  const [salonSearched, setSalonSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current user once on mount
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id);
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setFollowStatus({});
      setSearched(false);
      setLoading(false);
      setSalonResults([]);
      setPlacesResults([]);
      setSalonLoading(false);
      setSalonSearched(false);
      return;
    }

    setLoading(true);
    setSalonLoading(true);

    debounceRef.current = setTimeout(() => {
      void (async () => {
        const supabase = createClient();

        // People + Salons search run in parallel
        const [profilesRes, salonsRes, placesRes] = await Promise.all([
          // People
          supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .ilike("username", `%${trimmed}%`)
            .limit(10),
          // Gellog salons
          supabase
            .from("salon_profiles")
            .select("place_id, salon_name, is_claimed, logo_url")
            .ilike("salon_name", `%${trimmed}%`)
            .limit(10),
          // Google Places
          fetch(
            `/api/places/autocomplete?input=${encodeURIComponent(trimmed)}`,
          )
            .then(
              (r) =>
                r.json() as Promise<{
                  predictions?: Array<{
                    place_id: string;
                    description?: string;
                    types?: string[];
                    structured_formatting: {
                      main_text: string;
                      secondary_text: string;
                    };
                  }>;
                }>,
            )
            .catch(() => ({ predictions: [] })),
        ]);

        // --- People ---
        const profiles = profilesRes.data ?? [];

        const [countResults, followResults] = await Promise.all([
          Promise.all(
            profiles.map((p) =>
              supabase
                .from("ice_cream_logs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", p.id)
                .eq("visibility", "public"),
            ),
          ),
          currentUserId
            ? Promise.all(
                profiles.map((p) =>
                  supabase
                    .from("friendships")
                    .select("*", { count: "exact", head: true })
                    .eq("follower_id", currentUserId)
                    .eq("following_id", p.id),
                ),
              )
            : Promise.resolve([]),
        ]);

        const enriched: SearchProfile[] = profiles.map((p, i) => ({
          ...p,
          log_count: countResults[i].count ?? 0,
        }));

        const newFollowStatus: FollowStatus = {};
        if (currentUserId) {
          profiles.forEach((p, i) => {
            newFollowStatus[p.id] = ((followResults as { count: number | null }[])[i]?.count ?? 0) > 0;
          });
        }

        setResults(enriched);
        setFollowStatus(newFollowStatus);
        setSearched(true);
        setLoading(false);

        // --- Gellog salons + stats ---
        const salons = salonsRes.data ?? [];

        const salonStats = await Promise.all(
          salons.map((s) =>
            supabase
              .from("ice_cream_logs")
              .select("overall_rating")
              .eq("salon_place_id", s.place_id)
              .eq("visibility", "public"),
          ),
        );

        const salonEnriched: SalonResult[] = salons.map((s, i) => {
          const logs = salonStats[i].data ?? [];
          const visit_count = logs.length;
          const avg_rating = visit_count
            ? logs.reduce((sum, l) => sum + l.overall_rating, 0) / visit_count
            : 0;
          return {
            place_id: s.place_id,
            salon_name: s.salon_name,
            is_claimed: s.is_claimed,
            logo_url: s.logo_url,
            visit_count,
            avg_rating,
          };
        });

        // --- Google Places: establishments not already in merged Gellog list ---
        const gellogPlaceIds = new Set(salonEnriched.map((s) => s.place_id));
        const predictions = placesRes.predictions ?? [];
        const newPlacesResults: PlacesPrediction[] = predictions
          .filter((p) => !gellogPlaceIds.has(p.place_id))
          .filter((p) => autocompletePassesSalonFilter(p))
          .slice(0, 10)
          .map((p) => ({
            place_id: p.place_id,
            main_text: p.structured_formatting.main_text,
            secondary_text: p.structured_formatting.secondary_text,
          }));

        setSalonResults(salonEnriched);
        setPlacesResults(newPlacesResults);
        setSalonSearched(true);
        setSalonLoading(false);
      })();
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, currentUserId]);

  const noSalonResults = salonSearched && salonResults.length === 0 && placesResults.length === 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pb-24 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Search
          </h1>
        </header>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === "people" ? "Find people…" : "Find salons…"}
          autoFocus
          className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-teal-500"
        />

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {(["people", "salons"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {tab === "people" ? "People" : "Salons"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {activeTab === "people" ? (
            loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : searched && results.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No users found for &ldquo;{query.trim()}&rdquo;
              </p>
            ) : (
              results.map((profile) => {
                const displayName = profile.username ?? "Unknown";
                const initial = displayName.charAt(0).toUpperCase();
                const isOwnProfile = currentUserId === profile.id;

                return (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
                  >
                    <Link
                      href={`/profile/${profile.username}`}
                      className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-teal-500 text-white shadow-sm"
                    >
                      <AvatarFill avatarUrl={profile.avatar_url} displayName={displayName} initial={initial} />
                    </Link>

                    <Link
                      href={`/profile/${profile.username}`}
                      className="flex flex-1 flex-col"
                    >
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {displayName}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {profile.log_count} public scoop
                        {profile.log_count !== 1 ? "s" : ""}
                      </span>
                    </Link>

                    {!isOwnProfile && currentUserId ? (
                      <FollowButton
                        currentUserId={currentUserId}
                        targetUserId={profile.id}
                        initialIsFollowing={followStatus[profile.id] ?? false}
                      />
                    ) : null}
                  </div>
                );
              })
            )
          ) : salonLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : noSalonResults ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No salons found for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : !salonSearched ? null : (
            <>
              {/* Gellog salons */}
              {salonResults.map((salon) => (
                <Link
                  key={salon.place_id}
                  href={`/salon/${encodeURIComponent(salon.place_id)}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-teal-50 dark:bg-teal-950/30">
                    {salon.logo_url && salon.is_claimed ? (
                      <Image
                        src={salon.logo_url}
                        alt={salon.salon_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg">
                        🍦
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {salon.salon_name}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      ★ {salon.avg_rating.toFixed(1)} · {salon.visit_count}{" "}
                      {salon.visit_count === 1 ? "visit" : "visits"}
                    </span>
                  </div>

                  {salon.is_claimed && (
                    <span className="flex-shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
                      Claimed
                    </span>
                  )}
                </Link>
              ))}

              {/* Google Places salons not yet on Gellog */}
              {placesResults.map((place) => (
                <Link
                  key={place.place_id}
                  href={`/salon/${encodeURIComponent(place.place_id)}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <span className="text-lg">🍦</span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {place.main_text}
                    </span>
                    {place.secondary_text ? (
                      <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {place.secondary_text}
                      </span>
                    ) : null}
                  </div>

                  <span className="flex-shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Not yet on Gellog
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
