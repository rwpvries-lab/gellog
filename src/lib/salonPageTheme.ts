export type AccentKey = "terracotta" | "forest" | "blueberry" | "raspberry" | "hazelnut" | "mint";

export type AccentPreset = {
  key: AccentKey;
  label: string;
  hex: string;
  /** ~10% darkened, for the same hover treatment brand-primary/brand-primary-hover already use. */
  hoverHex: string;
  /** Text colour that keeps this hex >= 4.5:1 (WCAG AA, normal text) when used as a solid fill. */
  textColor: "cream" | "dark";
};

/**
 * Six brand-safe accent presets. Values are chosen (and the exact hex for
 * "blueberry" adjusted from the initial pick) so that EVERY preset clears
 * WCAG AA 4.5:1 for normal-size text when paired with its designated
 * textColor as a solid-fill surface (button background, filled pill) --
 * verified with a contrast-ratio script, not eyeballed:
 *   terracotta cream  4.82:1   forest cream     6.98:1
 *   blueberry  cream  4.82:1   raspberry dark   4.64:1
 *   hazelnut   dark   6.42:1   mint      dark  11.67:1
 * None of these are used as bare foreground text on the page's cream body
 * background -- only as solid-fill surfaces with their paired text colour --
 * so the "never body text" contrast requirement holds regardless of pick.
 */
export const ACCENT_PRESETS: AccentPreset[] = [
  { key: "terracotta", label: "Terracotta", hex: "#A85530", hoverHex: "#974C2B", textColor: "cream" },
  { key: "forest", label: "Forest", hex: "#1B5E52", hoverHex: "#18554A", textColor: "cream" },
  { key: "blueberry", label: "Blueberry", hex: "#4E6CA5", hoverHex: "#466194", textColor: "cream" },
  { key: "raspberry", label: "Raspberry", hex: "#E05A7A", hoverHex: "#CA516E", textColor: "dark" },
  { key: "hazelnut", label: "Hazelnut", hex: "#C49A6C", hoverHex: "#B08B61", textColor: "dark" },
  { key: "mint", label: "Mint", hex: "#A8E6CF", hoverHex: "#97CFBA", textColor: "dark" },
];

export const ACCENT_TEXT_HEX = { cream: "#FBF5E8", dark: "#2E1A16" } as const;

export function findAccentPreset(key: AccentKey | null): AccentPreset | null {
  if (!key) return null;
  return ACCENT_PRESETS.find((p) => p.key === key) ?? null;
}

export type PageTheme = {
  accent_key: AccentKey | null;
  announcement_text: string | null;
  /** ISO date string; banner auto-hides once this has passed. */
  announcement_expires_at: string | null;
  /** Storage path within the salon-covers bucket, not a full URL. */
  cover_photo_url: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  section_visibility: {
    recent_logs: boolean;
    stats: boolean;
  };
};

export function defaultPageTheme(): PageTheme {
  return {
    accent_key: null,
    announcement_text: null,
    announcement_expires_at: null,
    cover_photo_url: null,
    social_instagram: null,
    social_facebook: null,
    social_tiktok: null,
    section_visibility: { recent_logs: true, stats: true },
  };
}

export function resolvePageTheme(stored: unknown): PageTheme {
  const defaults = defaultPageTheme();
  if (!stored || typeof stored !== "object") return defaults;
  const raw = stored as Partial<PageTheme> & {
    section_visibility?: Partial<PageTheme["section_visibility"]>;
  };
  return {
    accent_key: (raw.accent_key as AccentKey) ?? defaults.accent_key,
    announcement_text: raw.announcement_text ?? defaults.announcement_text,
    announcement_expires_at: raw.announcement_expires_at ?? defaults.announcement_expires_at,
    cover_photo_url: raw.cover_photo_url ?? defaults.cover_photo_url,
    social_instagram: raw.social_instagram ?? defaults.social_instagram,
    social_facebook: raw.social_facebook ?? defaults.social_facebook,
    social_tiktok: raw.social_tiktok ?? defaults.social_tiktok,
    section_visibility: {
      recent_logs: raw.section_visibility?.recent_logs ?? defaults.section_visibility.recent_logs,
      stats: raw.section_visibility?.stats ?? defaults.section_visibility.stats,
    },
  };
}

export function isAnnouncementLive(theme: PageTheme): boolean {
  if (!theme.announcement_text?.trim()) return false;
  if (!theme.announcement_expires_at) return true;
  return new Date(theme.announcement_expires_at) > new Date();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function publicCoverPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/salon-covers/${path}`;
}
