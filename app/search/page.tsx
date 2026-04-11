'use client';

import { AppShell } from "@/app/components/AppShell";
import { createClient } from "@/src/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FollowButton } from "@/app/profile/[username]/FollowButton";
import { autocompletePassesSalonFilter } from "@/src/lib/looksLikeIceCreamSalon";

const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;

function publicSalonLogoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!supabaseBase) return path;
  return `${supabaseBase}/storage/v1/object/public/salon-logos/${path}`;
}

function AvatarFill({ avatarUrl, displayName, initial }: { avatarUrl: string | null; displayName: string; initial: string }) {
  const [imgError, setImgError] = useState(false);
  return avatarUrl && !imgError ? (
    <Image
      src={avatarUrl}
      alt={displayName}
      fill
      className="object-cover"
      sizes="40px"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-[color:var(--color-teal)] text-sm font-semibold text-[color:var(--color-on-brand)]">
      {initial}
    </span>
  );
}

function SalonSearchLogo({ logoUrl, salonName }: { logoUrl: string; salonName: string }) {
  const [imgError, setImgError] = useState(false);
  const src = publicSalonLogoUrl(logoUrl);
  return src && !imgError ? (
    <Image
      src={src}
      alt={salonName}
      width={60}
      height={60}
      className="h-full w-full object-cover"
      sizes="40px"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center text-lg">🍦</span>
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
    <div className="flex animate-pulse items-center gap-3 rounded-2xl bg-[color:var(--color-surface)] p-3 shadow-sm ring-1 ring-[color:var(--color-border)]">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[color:var(--color-surface-alt)]" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-28 rounded bg-[color:var(--color-surface-alt)]" />
        <div className="h-3 w-16 rounded bg-[color:var(--color-surface-alt)]" />
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
    <AppShell>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text-primary)]">
            Search
          </h1>
        </header>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === "people" ? "Find people…" : "Find salons…"}
          autoFocus
          className="w-full rounded-2xl border-0 bg-[color:var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-text-primary)] shadow-sm ring-1 ring-[color:var(--color-border)] placeholder:text-[color:var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal)]"
        />

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-[color:var(--color-surface-alt)] p-1 ring-1 ring-[color:var(--color-border)]">
          {(["people", "salons"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-[color:var(--color-surface)] text-[color:var(--color-text-primary)] shadow-sm ring-1 ring-[color:var(--color-border)]"
                  : "text-[color:var(--color-text-secondary)]"
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
              <p className="py-8 text-center text-sm text-[color:var(--color-text-secondary)]">
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
                    className="flex items-center gap-3 rounded-2xl bg-[color:var(--color-surface)] p-3 shadow-sm ring-1 ring-[color:var(--color-border)]"
                  >
                    <Link
                      href={`/profile/${profile.username}`}
                      className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full shadow-sm ring-1 ring-[color:var(--color-border)]"
                    >
                      <AvatarFill avatarUrl={profile.avatar_url} displayName={displayName} initial={initial} />
                    </Link>

                    <Link
                      href={`/profile/${profile.username}`}
                      className="flex flex-1 flex-col"
                    >
                      <span className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                        {displayName}
                      </span>
                      <span className="text-xs text-[color:var(--color-text-secondary)]">
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
            <p className="py-8 text-center text-sm text-[color:var(--color-text-secondary)]">
              No salons found for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : !salonSearched ? null : (
            <>
              {/* Gellog salons */}
              {salonResults.map((salon) => (
                <Link
                  key={salon.place_id}
                  href={`/salon/${encodeURIComponent(salon.place_id)}`}
                  className="flex items-center gap-3 rounded-2xl bg-[color:var(--color-surface)] p-3 shadow-sm ring-1 ring-[color:var(--color-border)]"
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[color:var(--color-teal-bg)]">
                    {salon.logo_url && salon.is_claimed ? (
                      <SalonSearchLogo logoUrl={salon.logo_url} salonName={salon.salon_name} />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg">
                        🍦
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-[color:var(--color-text-primary)]">
                      {salon.salon_name}
                    </span>
                    <span className="text-xs text-[color:var(--color-text-secondary)]">
                      ★ {salon.avg_rating.toFixed(1)} · {salon.visit_count}{" "}
                      {salon.visit_count === 1 ? "visit" : "visits"}
                    </span>
                  </div>

                  {salon.is_claimed && (
                    <span className="flex-shrink-0 rounded-full bg-[color:var(--color-teal-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-teal)] ring-1 ring-[color:color-mix(in_srgb,var(--color-teal)_35%,var(--color-border))]">
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
                  className="flex items-center gap-3 rounded-2xl bg-[color:var(--color-surface)] p-3 shadow-sm ring-1 ring-[color:var(--color-border)]"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface-alt)]">
                    <span className="text-lg">🍦</span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-[color:var(--color-text-primary)]">
                      {place.main_text}
                    </span>
                    {place.secondary_text ? (
                      <span className="truncate text-xs text-[color:var(--color-text-secondary)]">
                        {place.secondary_text}
                      </span>
                    ) : null}
                  </div>

                  <span className="flex-shrink-0 rounded-full bg-[color:var(--color-surface-alt)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-text-secondary)] ring-1 ring-[color:var(--color-border)]">
                    Not yet on Gellog
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>
    </AppShell>
  );
}
