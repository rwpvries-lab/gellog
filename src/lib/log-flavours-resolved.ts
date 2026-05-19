/**
 * Normalizes `ice_cream_logs` rows after Supabase embed:
 * - Prefer `log_flavours_resolved` when present (DB view).
 * - Otherwise use nested `log_flavours` (table) — this is the default until the view exists.
 */

export type LogFlavour = {
  id: string;
  flavour_name: string;
  input_name?: string | null;
  canonical_name_en?: string | null;
  canonical_name_nl?: string | null;
  canonical_name_it?: string | null;
  base_token?: string | null;
  drizzle_token?: string | null;
  crumble_token?: string | null;
  rating: number | null;
  tags: string[] | null;
  rating_texture: number | null;
  rating_originality: number | null;
  rating_intensity: number | null;
  rating_presentation: number | null;
};

export type LogFlavoursResolvedRow = {
  log_flavour_id: string;
  log_id: string;
  input_name: string | null;
  /** @deprecated DB column renamed to `rating_stars` */
  rating?: number | null;
  rating_stars?: number | null;
  tags: string[] | null;
  rating_texture?: number | null;
  texture?: number | null;
  rating_originality?: number | null;
  originality?: number | null;
  rating_intensity?: number | null;
  intensity?: number | null;
  rating_presentation?: number | null;
  presentation?: number | null;
  flavour_id: string | null;
  flavour_slug: string | null;
  canonical_name_en: string | null;
  canonical_name_nl: string | null;
  canonical_name_it: string | null;
  base_token: string | null;
  drizzle_token: string | null;
  crumble_token: string | null;
};

type LegacyLogFlavourEmbedRow = {
  id: unknown;
  flavour_name?: unknown;
  canonical_flavour_id?: unknown;
  rating?: unknown;
  rating_stars?: unknown;
  tags?: unknown;
  rating_texture?: unknown;
  texture?: unknown;
  rating_originality?: unknown;
  originality?: unknown;
  rating_intensity?: unknown;
  intensity?: unknown;
  rating_presentation?: unknown;
  presentation?: unknown;
  base_token?: unknown;
  drizzle_token?: unknown;
  crumble_token?: unknown;
  canonical_name_en?: unknown;
  canonical_name_nl?: unknown;
  canonical_name_it?: unknown;
};

function toNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Nested fragment for `ice_cream_logs` `.select(...)` — uses the real table (view optional). */
export const LOG_FLAVOURS_RESOLVED_SELECT = `
  log_flavours (
    id,
    flavour_name,
    canonical_flavour_id,
    rating_stars,
    tags,
    texture,
    originality,
    intensity,
    presentation,
    base_token,
    drizzle_token,
    crumble_token,
    canonical_name_en,
    canonical_name_nl,
    canonical_name_it
  )
`;

export function mapResolvedRowsToLogFlavours(
  rows: LogFlavoursResolvedRow[] | null | undefined,
): LogFlavour[] {
  return (rows ?? []).map((r) => ({
    id: r.log_flavour_id,
    flavour_name: r.input_name?.trim() ?? "",
    input_name: r.input_name,
    canonical_name_en: r.canonical_name_en,
    canonical_name_nl: r.canonical_name_nl,
    canonical_name_it: r.canonical_name_it,
    base_token: r.base_token,
    drizzle_token: r.drizzle_token,
    crumble_token: r.crumble_token,
    rating: r.rating_stars ?? r.rating ?? null,
    tags: r.tags,
    rating_texture: r.texture ?? r.rating_texture ?? null,
    rating_originality: r.originality ?? r.rating_originality ?? null,
    rating_intensity: r.intensity ?? r.rating_intensity ?? null,
    rating_presentation: r.presentation ?? r.rating_presentation ?? null,
  }));
}

export function mapLegacyEmbedRowsToLogFlavours(
  rows: LegacyLogFlavourEmbedRow[] | null | undefined,
): LogFlavour[] {
  return (rows ?? []).map((lf, index) => {
    const id = lf.id != null ? String(lf.id) : `missing-${index}`;
    const name = lf.flavour_name != null ? String(lf.flavour_name) : "";
    return {
      id,
      flavour_name: name,
      input_name: name || null,
      canonical_name_en: lf.canonical_name_en != null ? String(lf.canonical_name_en) : null,
      canonical_name_nl: lf.canonical_name_nl != null ? String(lf.canonical_name_nl) : null,
      canonical_name_it: lf.canonical_name_it != null ? String(lf.canonical_name_it) : null,
      base_token: lf.base_token != null ? String(lf.base_token) : null,
      drizzle_token: lf.drizzle_token != null ? String(lf.drizzle_token) : null,
      crumble_token: lf.crumble_token != null ? String(lf.crumble_token) : null,
      rating: toNumOrNull(lf.rating_stars ?? lf.rating),
      tags: Array.isArray(lf.tags) ? (lf.tags as string[]) : null,
      rating_texture: toNumOrNull(lf.texture ?? lf.rating_texture),
      rating_originality: toNumOrNull(lf.originality ?? lf.rating_originality),
      rating_intensity: toNumOrNull(lf.intensity ?? lf.rating_intensity),
      rating_presentation: toNumOrNull(lf.presentation ?? lf.rating_presentation),
    };
  });
}

/** Prefer `log_flavours_resolved` embed; otherwise map nested `log_flavours` rows. */
export function applyResolvedFlavoursToLogRow<L extends Record<string, unknown>>(
  row: L,
): Omit<L, "log_flavours_resolved" | "log_flavours"> & { log_flavours: LogFlavour[] } {
  const r = row as L & {
    log_flavours_resolved?: LogFlavoursResolvedRow[];
    log_flavours?: LegacyLogFlavourEmbedRow[];
  };
  const { log_flavours_resolved, log_flavours, ...rest } = r;

  if (Array.isArray(log_flavours_resolved)) {
    return {
      ...(rest as Omit<L, "log_flavours_resolved" | "log_flavours">),
      log_flavours: mapResolvedRowsToLogFlavours(log_flavours_resolved),
    };
  }

  return {
    ...(rest as Omit<L, "log_flavours_resolved" | "log_flavours">),
    log_flavours: mapLegacyEmbedRowsToLogFlavours(log_flavours),
  };
}
