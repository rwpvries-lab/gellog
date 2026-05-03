/**
 * Build canonical flavour ranking from `log_flavours_resolved`-shaped rows
 * (or legacy `log_flavours` rows mapped with flavour_id null).
 */

export type LogFlavoursResolvedRankingRow = {
  log_id: string;
  flavour_id: string | null;
  flavour_slug: string | null;
  canonical_name_nl: string | null;
  canonical_name_en: string | null;
  base_token: string | null;
  drizzle_token: string | null;
  crumble_token: string | null;
  rating: number | null;
  input_name: string | null;
};

export type CanonicalFlavourRankingRow = {
  rank: number;
  flavourId: string;
  displayName: string;
  logCount: number;
  avgRating: number | null;
  baseToken: string | null;
  drizzleToken: string | null;
  crumbleToken: string | null;
};

type Group = {
  flavour_id: string;
  flavour_slug: string | null;
  canonical_name_nl: string | null;
  canonical_name_en: string | null;
  base_token: string | null;
  drizzle_token: string | null;
  crumble_token: string | null;
  ratingSum: number;
  ratingCount: number;
  count: number;
};

function rankingFromResolvedGroups(rows: LogFlavoursResolvedRankingRow[]): {
  ranking: CanonicalFlavourRankingRow[];
  uncategorisedLogCount: number;
  uncategorisedInputNames: string[];
} {
  const uncategorisedLogIds = new Set<string>();
  const uncategorisedNames = new Set<string>();

  for (const r of rows) {
    if (r.flavour_id == null) {
      uncategorisedLogIds.add(r.log_id);
      const n = r.input_name?.trim();
      if (n) uncategorisedNames.add(n);
    }
  }

  const groups = new Map<string, Group>();

  for (const r of rows) {
    if (r.flavour_id == null) continue;
    if (r.base_token == null) {
      uncategorisedLogIds.add(r.log_id);
      continue;
    }
    const id = r.flavour_id;
    let g = groups.get(id);
    if (!g) {
      g = {
        flavour_id: id,
        flavour_slug: r.flavour_slug,
        canonical_name_nl: r.canonical_name_nl,
        canonical_name_en: r.canonical_name_en,
        base_token: r.base_token,
        drizzle_token: r.drizzle_token,
        crumble_token: r.crumble_token,
        ratingSum: 0,
        ratingCount: 0,
        count: 0,
      };
      groups.set(id, g);
    } else if (!g.base_token && r.base_token) {
      g.base_token = r.base_token;
      g.drizzle_token = r.drizzle_token ?? g.drizzle_token;
      g.crumble_token = r.crumble_token ?? g.crumble_token;
      if (!g.canonical_name_nl?.trim() && r.canonical_name_nl?.trim()) {
        g.canonical_name_nl = r.canonical_name_nl;
      }
      if (!g.canonical_name_en?.trim() && r.canonical_name_en?.trim()) {
        g.canonical_name_en = r.canonical_name_en;
      }
    }
    g.count += 1;
    if (r.rating != null && Number.isFinite(r.rating)) {
      g.ratingSum += r.rating;
      g.ratingCount += 1;
    }
  }

  const sorted = [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const nameA = a.canonical_name_nl?.trim() || a.canonical_name_en?.trim() || "";
    const nameB = b.canonical_name_nl?.trim() || b.canonical_name_en?.trim() || "";
    return nameA.localeCompare(nameB);
  });

  const withTokens = sorted.filter((g) => g.base_token != null);
  const top = withTokens.slice(0, 10);

  const ranking: CanonicalFlavourRankingRow[] = top.map((g, i) => ({
    rank: i + 1,
    flavourId: g.flavour_id,
    displayName: g.canonical_name_nl?.trim() || g.canonical_name_en?.trim() || "Flavour",
    logCount: g.count,
    avgRating: g.ratingCount > 0 ? g.ratingSum / g.ratingCount : null,
    baseToken: g.base_token,
    drizzleToken: g.drizzle_token,
    crumbleToken: g.crumble_token,
  }));

  return {
    ranking,
    uncategorisedLogCount: uncategorisedLogIds.size,
    uncategorisedInputNames: [...uncategorisedNames].sort((a, b) => a.localeCompare(b)),
  };
}

/** When no `flavour_id` is present (legacy logs), roll up by free-text name. */
function rankingFromLegacyNameGroups(rows: LogFlavoursResolvedRankingRow[]): {
  ranking: CanonicalFlavourRankingRow[];
  uncategorisedLogCount: number;
  uncategorisedInputNames: string[];
} {
  const uncategorisedLogIds = new Set<string>();
  const groups = new Map<string, Group>();

  for (const r of rows) {
    const name = r.input_name?.trim();
    if (!name) {
      uncategorisedLogIds.add(r.log_id);
      continue;
    }
    if (r.base_token == null) {
      uncategorisedLogIds.add(r.log_id);
      continue;
    }
    const key = name.toLowerCase();
    let g = groups.get(key);
    if (!g) {
      g = {
        flavour_id: `legacy:${key}`,
        flavour_slug: null,
        canonical_name_nl: r.canonical_name_nl?.trim() || name,
        canonical_name_en: r.canonical_name_en?.trim() || null,
        base_token: r.base_token,
        drizzle_token: r.drizzle_token,
        crumble_token: r.crumble_token,
        ratingSum: 0,
        ratingCount: 0,
        count: 0,
      };
      groups.set(key, g);
    } else {
      if (!g.base_token && r.base_token) {
        g.base_token = r.base_token;
        g.drizzle_token = r.drizzle_token ?? g.drizzle_token;
        g.crumble_token = r.crumble_token ?? g.crumble_token;
      }
      if (!g.canonical_name_nl?.trim() && r.canonical_name_nl?.trim()) {
        g.canonical_name_nl = r.canonical_name_nl;
      }
      if (!g.canonical_name_en?.trim() && r.canonical_name_en?.trim()) {
        g.canonical_name_en = r.canonical_name_en;
      }
    }
    g.count += 1;
    if (r.rating != null && Number.isFinite(r.rating)) {
      g.ratingSum += r.rating;
      g.ratingCount += 1;
    }
  }

  const sorted = [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const nameA = a.canonical_name_nl?.trim() || "";
    const nameB = b.canonical_name_nl?.trim() || "";
    return nameA.localeCompare(nameB);
  });

  const withTokens = sorted.filter((g) => g.base_token != null);
  const top = withTokens.slice(0, 10);

  const ranking: CanonicalFlavourRankingRow[] = top.map((g, i) => ({
    rank: i + 1,
    flavourId: g.flavour_id,
    displayName: g.canonical_name_nl?.trim() || g.canonical_name_en?.trim() || "Flavour",
    logCount: g.count,
    avgRating: g.ratingCount > 0 ? g.ratingSum / g.ratingCount : null,
    baseToken: g.base_token,
    drizzleToken: g.drizzle_token,
    crumbleToken: g.crumble_token,
  }));

  return {
    ranking,
    uncategorisedLogCount: uncategorisedLogIds.size,
    uncategorisedInputNames: [],
  };
}

export function buildCanonicalFlavourRanking(rows: LogFlavoursResolvedRankingRow[]): {
  ranking: CanonicalFlavourRankingRow[];
  uncategorisedLogCount: number;
  uncategorisedInputNames: string[];
} {
  const hasResolved = rows.some((r) => r.flavour_id != null);
  if (hasResolved) {
    return rankingFromResolvedGroups(rows);
  }
  return rankingFromLegacyNameGroups(rows);
}
