import type { PeakGridPayload } from "@/src/lib/salonPeakGrid";
import type { SalonDashboardWeatherPayload } from "@/src/lib/salonDashboardWeather";
import type {
  Suggestion,
  VitrineFlavour,
  VitrineVisibilityLogRow,
} from "../FlavourBoard";

export type Tier = "free" | "basic" | "pro";

export type WidgetId =
  | "stats_strip"
  | "flavour_board"
  | "weather"
  | "visits_trend"
  | "flavour_performance"
  | "recent_logs"
  | "peak_times"
  | "visitor_recurrence"
  | "dow_distribution"
  | "rating_histogram"
  | "vitrine_conversion"
  | "flavour_insights"
  | "csv_export"
  | "log_cleanup_history";

/** Order here is also the default (unconfigured) layout order. */
export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "stats_strip",
  "flavour_board",
  "weather",
  "visits_trend",
  "flavour_performance",
  "recent_logs",
  "peak_times",
  "visitor_recurrence",
  "dow_distribution",
  "rating_histogram",
  "vitrine_conversion",
  "flavour_insights",
  "csv_export",
  "log_cleanup_history",
];

export const WIDGET_MIN_TIER: Record<WidgetId, Tier> = {
  stats_strip: "free",
  flavour_board: "free",
  weather: "free",
  visits_trend: "basic",
  flavour_performance: "basic",
  recent_logs: "basic",
  peak_times: "basic",
  visitor_recurrence: "pro",
  dow_distribution: "pro",
  rating_histogram: "pro",
  vitrine_conversion: "pro",
  flavour_insights: "pro",
  csv_export: "pro",
  log_cleanup_history: "pro",
};

export const WIDGET_TITLES: Record<WidgetId, string> = {
  stats_strip: "At a glance",
  flavour_board: "Flavour Board",
  weather: "Weather",
  visits_trend: "Visits & rating trend",
  flavour_performance: "Flavour performance",
  recent_logs: "Recent visits",
  peak_times: "Peak times",
  visitor_recurrence: "New vs returning visitors",
  dow_distribution: "Day-of-week distribution",
  rating_histogram: "Rating distribution",
  vitrine_conversion: "Vitrine conversion",
  flavour_insights: "Flavour Insights",
  csv_export: "Export analytics",
  log_cleanup_history: "Log cleanup history",
};

export type PlaceholderVariant = "chart" | "table" | "list" | "grid";

export const WIDGET_PLACEHOLDER_VARIANT: Record<WidgetId, PlaceholderVariant> = {
  stats_strip: "grid",
  flavour_board: "list",
  weather: "list",
  visits_trend: "chart",
  flavour_performance: "table",
  recent_logs: "list",
  peak_times: "grid",
  visitor_recurrence: "chart",
  dow_distribution: "grid",
  rating_histogram: "chart",
  vitrine_conversion: "grid",
  flavour_insights: "list",
  csv_export: "list",
  log_cleanup_history: "list",
};

export function tierRank(t: Tier): number {
  return t === "pro" ? 2 : t === "basic" ? 1 : 0;
}

export function tierMeets(actual: Tier, required: Tier): boolean {
  return tierRank(actual) >= tierRank(required);
}

export type DashboardLayoutConfig = {
  order: WidgetId[];
  hidden: WidgetId[];
};

const ALL_WIDGET_IDS = new Set<string>(DEFAULT_WIDGET_ORDER);

function isWidgetId(v: unknown): v is WidgetId {
  return typeof v === "string" && ALL_WIDGET_IDS.has(v);
}

/**
 * Merges a stored dashboard_layout jsonb value with the current widget
 * registry: unknown/removed ids are dropped, newly-added widgets (shipped
 * after the owner last customized) are appended so they aren't silently
 * hidden. Any invalid/null input resolves to the plain default layout.
 */
export function resolveDashboardLayout(stored: unknown): DashboardLayoutConfig {
  if (!stored || typeof stored !== "object") {
    return { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
  }
  const raw = stored as { order?: unknown; hidden?: unknown };
  const storedOrder = Array.isArray(raw.order) ? raw.order.filter(isWidgetId) : [];
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !storedOrder.includes(id));
  const order = [...storedOrder, ...missing];
  const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter(isWidgetId) : [];
  return { order, hidden };
}

export type Stats = {
  totalVisits: number;
  avgRating: number;
  mostLoggedFlavour: string | null;
  visitsThisMonth: number;
};

export type WeeklyVisit = { week: string; visits: number };
export type FlavourPerformanceRow = { flavour_name: string; log_count: number; avg_rating: number };
export type RecentLogRow = {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  overall_rating: number;
  notes: string | null;
  photo_url: string | null;
  visited_at: string;
  flavour_names: string[];
};
export type VisitorRecurrenceRow = { month: string; new_visitors: number; returning_visitors: number };
export type DowRow = { dow: number; visits: number };
export type RatingHistogramRow = { rating: number; count: number };
export type VitrineConversionRow = {
  total_logs: number;
  vitrine_matched_logs: number;
  conversion_pct: number;
};

export type FlavourInsightRow = {
  id: string;
  name: string;
  colour: string;
  displayPct: number;
  logSharePct: number;
};

/** Everything a widget might need. Individual widgets destructure only what they use. */
export type DashboardData = {
  tier: Tier;
  placeId: string;
  stats: Stats;
  weeklyVisits: WeeklyVisit[];
  flavourPerformance: FlavourPerformanceRow[];
  recentLogs: RecentLogRow[];
  peakGrid: PeakGridPayload | null;
  visitorRecurrence: VisitorRecurrenceRow[];
  dowDistribution: DowRow[];
  ratingHistogram: RatingHistogramRow[];
  vitrineConversion: VitrineConversionRow | null;
  flavourInsights: FlavourInsightRow[];
  dashboardWeather: SalonDashboardWeatherPayload | null;
  salonHasCoordinates: boolean;
  initialVitrineFlavours: VitrineFlavour[];
  initialSuggestions: Suggestion[];
  visibilityLog: VitrineVisibilityLogRow[];
  flavourNameById: Record<string, string>;
  onVisibilityLogAppend: (row: VitrineVisibilityLogRow) => void;
  onFlavoursSnapshot: (rows: { id: string; name: string }[]) => void;
};

/**
 * What the server component fetches and can pass across the server/client
 * boundary as plain data. DashboardClient adds the two live-state fields
 * and their setters (which must be created client-side) to build the full
 * DashboardData passed into the widget grid.
 */
export type DashboardDataBase = Omit<
  DashboardData,
  "visibilityLog" | "flavourNameById" | "onVisibilityLogAppend" | "onFlavoursSnapshot"
> & {
  initialVitrineLog: VitrineVisibilityLogRow[];
};
