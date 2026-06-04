import { gelatoTokensFromNullableTokens } from "@/src/lib/gelato-tokens";
import {
  buildCanonicalFlavourRanking,
  type LogFlavoursResolvedRankingRow,
} from "@/src/lib/profile-flavour-ranking";
import type { ProfileSheetRankedFlavour } from "@/app/icecream/profile/ProfileSheet";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatsLogFlavour = {
  flavour_name: string;
  rating: number | null;
  rating_texture: number | null;
  rating_originality: number | null;
  rating_intensity: number | null;
  rating_presentation: number | null;
};

export type StatsLog = {
  id: string;
  salon_name: string;
  salon_place_id: string | null;
  salon_city: string | null;
  overall_rating: number;
  visited_at: string;
  price_cents: number | null;
  weather_condition: string | null;
  log_flavours: StatsLogFlavour[];
};

type FlavourStats = {
  name: string;
  timesTried: number;
  ratingCount: number;
  ratingSum: number;
  textureSum: number;
  textureCount: number;
  originalitySum: number;
  originalityCount: number;
  intensitySum: number;
  intensityCount: number;
  presentationSum: number;
  presentationCount: number;
};

/** Raw row shape from the `log_flavours` table used to build the canonical ranking. */
export type LogFlavourRankingInputRow = {
  log_id: string;
  flavour_name: string;
  rating_stars: number | null;
  canonical_flavour_id?: string | null;
  base_token?: string | null;
  drizzle_token?: string | null;
  crumble_token?: string | null;
  canonical_name_en?: string | null;
  canonical_name_nl?: string | null;
  canonical_name_it?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pick the Google place id that best matches logs for this salon name (visit count, then recency). */
export function resolveSalonPlaceId(logs: StatsLog[], salonName: string): string | null {
  const name = salonName.trim();
  const counts = new Map<string, { visits: number; lastVisited: Date }>();
  for (const log of logs) {
    if (log.salon_name.trim() !== name) continue;
    const pid = log.salon_place_id?.trim();
    if (!pid) continue;
    const visited = new Date(log.visited_at);
    const cur = counts.get(pid);
    if (!cur) counts.set(pid, { visits: 1, lastVisited: visited });
    else {
      counts.set(pid, {
        visits: cur.visits + 1,
        lastVisited: visited > cur.lastVisited ? visited : cur.lastVisited,
      });
    }
  }
  if (counts.size === 0) return null;
  let bestId: string | null = null;
  let bestVisits = -1;
  let bestLast = new Date(0);
  for (const [pid, { visits, lastVisited }] of counts) {
    if (visits > bestVisits || (visits === bestVisits && lastVisited > bestLast)) {
      bestId = pid;
      bestVisits = visits;
      bestLast = lastVisited;
    }
  }
  return bestId;
}

export function deriveStats(logs: StatsLog[]) {
  const totalAllTime = logs.length;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const totalThisYear = logs.filter(
    (log) => new Date(log.visited_at) >= startOfYear,
  ).length;

  const averageOverallRating =
    logs.length > 0
      ? logs.reduce((sum, log) => sum + log.overall_rating, 0) / logs.length
      : null;

  const flavourMap = new Map<string, FlavourStats>();

  logs.forEach((log) => {
    (log.log_flavours ?? []).forEach((flavour) => {
      const key = flavour.flavour_name.trim();
      if (!key) return;

      const existing = flavourMap.get(key) ?? {
        name: key,
        timesTried: 0,
        ratingCount: 0,
        ratingSum: 0,
        textureSum: 0,
        textureCount: 0,
        originalitySum: 0,
        originalityCount: 0,
        intensitySum: 0,
        intensityCount: 0,
        presentationSum: 0,
        presentationCount: 0,
      };

      existing.timesTried += 1;
      if (flavour.rating != null) {
        existing.ratingCount += 1;
        existing.ratingSum += flavour.rating;
      }
      if (flavour.rating_texture != null) {
        existing.textureCount += 1;
        existing.textureSum += flavour.rating_texture;
      }
      if (flavour.rating_originality != null) {
        existing.originalityCount += 1;
        existing.originalitySum += flavour.rating_originality;
      }
      if (flavour.rating_intensity != null) {
        existing.intensityCount += 1;
        existing.intensitySum += flavour.rating_intensity;
      }
      if (flavour.rating_presentation != null) {
        existing.presentationCount += 1;
        existing.presentationSum += flavour.rating_presentation;
      }

      flavourMap.set(key, existing);
    });
  });

  const salonMap = new Map<
    string,
    { name: string; count: number; lastVisited: Date }
  >();

  logs.forEach((log) => {
    const key = log.salon_name.trim();
    if (!key) return;
    const visited = new Date(log.visited_at);
    const existing = salonMap.get(key);
    if (!existing) {
      salonMap.set(key, { name: key, count: 1, lastVisited: visited });
    } else {
      salonMap.set(key, {
        name: existing.name,
        count: existing.count + 1,
        lastVisited:
          visited > existing.lastVisited ? visited : existing.lastVisited,
      });
    }
  });

  const mostVisitedSalon =
    salonMap.size > 0
      ? Array.from(salonMap.values()).sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.lastVisited.getTime() - a.lastVisited.getTime();
        })[0]
      : null;

  const weatherCounts = new Map<string, number>();
  logs.forEach((log) => {
    const condition = log.weather_condition?.trim();
    if (!condition) return;
    weatherCounts.set(condition, (weatherCounts.get(condition) ?? 0) + 1);
  });
  const bestWeather =
    weatherCounts.size > 0
      ? Array.from(weatherCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  const logsWithPrice = logs.filter((log) => log.price_cents != null);
  const totalSpent =
    logsWithPrice.length >= 3
      ? logsWithPrice.reduce(
          (sum, log) => sum + (log.price_cents ?? 0) / 100,
          0,
        )
      : null;
  const averagePerVisit =
    logsWithPrice.length >= 3 ? totalSpent! / logsWithPrice.length : null;

  const flavoursRollup = Array.from(flavourMap.values())
    .map((s) => ({ name: s.name, timesTried: s.timesTried }))
    .sort(
      (a, b) =>
        b.timesTried - a.timesTried || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  const salonsRollup = Array.from(salonMap.values())
    .map((s) => ({
      name: s.name,
      visitCount: s.count,
      lastVisitedIso: s.lastVisited.toISOString(),
      placeId: resolveSalonPlaceId(logs, s.name),
    }))
    .sort(
      (a, b) =>
        b.visitCount - a.visitCount ||
        b.lastVisitedIso.localeCompare(a.lastVisitedIso),
    );

  return {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    mostVisitedSalon,
    bestWeather,
    totalSpent,
    averagePerVisit,
    uniqueFlavourCount: flavourMap.size,
    uniqueSalonCount: salonMap.size,
    flavoursRollup,
    salonsRollup,
  };
}

/** Build the canonical flavour ranking (with gelato tokens) + uncategorised tallies from raw `log_flavours` rows. */
export function buildRankedFlavours(rows: LogFlavourRankingInputRow[]): {
  rankedFlavours: ProfileSheetRankedFlavour[];
  uncategorisedLogCount: number;
  uncategorisedInputNames: string[];
} {
  const resolvedLike: LogFlavoursResolvedRankingRow[] = rows.map((row) => ({
    log_id: row.log_id,
    flavour_id: null,
    flavour_slug: null,
    canonical_name_nl: row.canonical_name_nl ?? null,
    canonical_name_en: row.canonical_name_en ?? null,
    base_token: row.base_token ?? null,
    drizzle_token: row.drizzle_token ?? null,
    crumble_token: row.crumble_token ?? null,
    rating: row.rating_stars != null ? Number(row.rating_stars) : null,
    input_name: typeof row.flavour_name === "string" ? row.flavour_name : null,
  }));

  const { ranking, uncategorisedLogCount, uncategorisedInputNames } =
    buildCanonicalFlavourRanking(resolvedLike);

  const rankedFlavours: ProfileSheetRankedFlavour[] = ranking.map((r) => ({
    rank: r.rank,
    flavourId: r.flavourId,
    displayName: r.displayName,
    logCount: r.logCount,
    avgRating: r.avgRating,
    tokens: gelatoTokensFromNullableTokens(r.baseToken, r.drizzleToken, r.crumbleToken),
  }));

  return { rankedFlavours, uncategorisedLogCount, uncategorisedInputNames };
}
