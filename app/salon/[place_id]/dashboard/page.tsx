import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import type { Flavour, Suggestion } from "./FlavourBoard";
import type { VitrineFlavour, VitrineVisibilityLogRow } from "./VitrineBoard";
import type {
  FlavourInsightRow,
  MonthlyRating,
  TopFlavour,
  WeatherStat,
  WeeklyVisit,
} from "./AnalyticsSection";

type SalonProfile = {
  id: string;
  place_id: string;
  is_claimed: boolean;
  claim_verified: boolean;
  owner_id: string | null;
  salon_name: string;
  salon_lat: number | null;
  salon_lng: number | null;
  logo_url: string | null;
  bio: string | null;
  phone: string | null;
  website: string | null;
  salon_subscription_tier: "free" | "basic" | "pro" | null;
  salon_subscription_expires_at: string | null;
  created_at?: string | null;
};

type Stats = {
  totalVisits: number;
  avgRating: number;
  mostLoggedFlavour: string | null;
  visitsThisMonth: number;
};

export default async function SalonDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ place_id: string }>;
  searchParams: Promise<{ claimed?: string; upgrade?: string }>;
}) {
  const { place_id } = await params;
  const { claimed, upgrade } = await searchParams;
  const justUpgraded = upgrade === "success";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/salon/${place_id}/dashboard`);
  }

  const { data: salonProfile } = await supabase
    .from("salon_profiles")
    .select("*")
    .eq("place_id", place_id)
    .maybeSingle<SalonProfile>();

  // Must be the owner to access the dashboard
  if (!salonProfile || salonProfile.owner_id !== user.id) {
    redirect(`/salon/${place_id}`);
  }

  // Aggregate stats from ice_cream_logs
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const tier = salonProfile.salon_subscription_tier ?? "free";
  const isBasicOrPro = tier === "basic" || tier === "pro";
  const isPro = tier === "pro";

  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: logsData },
    { data: flavourData },
    { count: monthCount },
    { data: salonFlavoursData },
    { data: suggestionsData },
    { data: weeklyVisitsRaw },
    { data: topFlavoursRaw },
    { data: weatherRaw },
    { data: monthlyRatingsRaw },
    { data: vitrineFlavoursRaw },
    { data: vitrineLogRaw },
  ] = await Promise.all([
    supabase
      .from("ice_cream_logs")
      .select("overall_rating")
      .eq("salon_place_id", place_id),
    supabase
      .from("log_flavours")
      .select("flavour_name, log_id, ice_cream_logs!inner(salon_place_id)")
      .eq("ice_cream_logs.salon_place_id", place_id),
    supabase
      .from("ice_cream_logs")
      .select("*", { count: "exact", head: true })
      .eq("salon_place_id", place_id)
      .gte("visited_at", startOfMonth),
    supabase
      .from("salon_flavours")
      .select("*")
      .eq("salon_id", salonProfile.id)
      .order("position", { ascending: true }),
    supabase
      .from("flavour_suggestions")
      .select("*")
      .eq("salon_id", salonProfile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    // Visits by week (all tiers)
    isBasicOrPro
      ? supabase.rpc("salon_visits_by_week", { p_place_id: place_id, p_since: twelveWeeksAgo })
      : Promise.resolve({ data: [] }),
    // Top flavours (all tiers)
    isBasicOrPro
      ? supabase.rpc("salon_top_flavours", { p_place_id: place_id })
      : Promise.resolve({ data: [] }),
    // Weather stats (basic+)
    isBasicOrPro
      ? supabase.rpc("salon_weather_stats", { p_place_id: place_id })
      : Promise.resolve({ data: [] }),
    // Monthly ratings (pro only)
    isPro
      ? supabase.rpc("salon_monthly_ratings", { p_place_id: place_id })
      : Promise.resolve({ data: [] }),
    supabase
      .from("vitrine_flavours")
      .select("*")
      .eq("salon_place_id", place_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("vitrine_visibility_log")
      .select("*")
      .eq("salon_place_id", place_id)
      .order("changed_at", { ascending: false })
      .limit(50),
  ]);

  const logs = logsData ?? [];
  const totalVisits = logs.length;
  const avgRating =
    totalVisits > 0
      ? logs.reduce((s, l) => s + (l.overall_rating ?? 0), 0) / totalVisits
      : 0;

  // Most logged flavour
  const flavourCounts: Record<string, number> = {};
  for (const row of flavourData ?? []) {
    flavourCounts[row.flavour_name] =
      (flavourCounts[row.flavour_name] ?? 0) + 1;
  }
  const mostLoggedFlavour =
    Object.entries(flavourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const stats: Stats = {
    totalVisits,
    avgRating,
    mostLoggedFlavour,
    visitsThisMonth: monthCount ?? 0,
  };

  let flavourInsightsRows: FlavourInsightRow[] = [];
  if (isPro && salonProfile.created_at) {
    const vitrineList = (vitrineFlavoursRaw ?? []) as VitrineFlavour[];
    const activeSeconds = Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(salonProfile.created_at as string).getTime()) /
          1000,
      ),
    );
    const totalLogCount = logs.length;

    const logIdsByFlavourName = new Map<string, Set<string>>();
    for (const row of flavourData ?? []) {
      const r = row as { flavour_name: string; log_id: string };
      const key = r.flavour_name.trim().toLowerCase();
      if (!logIdsByFlavourName.has(key)) logIdsByFlavourName.set(key, new Set());
      logIdsByFlavourName.get(key)!.add(r.log_id);
    }

    const rows: FlavourInsightRow[] = vitrineList.map((v) => {
      const stored = Number(v.total_display_seconds ?? 0);
      let displaySecs = stored;
      if (v.is_visible && v.display_started_at) {
        displaySecs += Math.floor(
          (Date.now() - new Date(v.display_started_at).getTime()) / 1000,
        );
      }
      const displayPct = Math.min(100, (displaySecs / activeSeconds) * 100);
      const nameKey = v.name.trim().toLowerCase();
      const logsWithFlavour = logIdsByFlavourName.get(nameKey)?.size ?? 0;
      const logSharePct =
        totalLogCount > 0 ? (logsWithFlavour / totalLogCount) * 100 : 0;
      return {
        id: v.id,
        name: v.name,
        colour: v.colour ?? "#F9A8D4",
        displayPct,
        logSharePct,
      };
    });
    rows.sort((a, b) => b.logSharePct - a.logSharePct);
    flavourInsightsRows = rows;
  }

  return (
    <DashboardClient
      salonProfile={salonProfile}
      stats={stats}
      justClaimed={claimed === "1"}
      justUpgraded={justUpgraded}
      initialFlavours={(salonFlavoursData ?? []) as Flavour[]}
      initialSuggestions={(suggestionsData ?? []) as Suggestion[]}
      weeklyVisits={(weeklyVisitsRaw ?? []) as WeeklyVisit[]}
      topFlavours={(topFlavoursRaw ?? []) as TopFlavour[]}
      weatherStats={(weatherRaw ?? []) as WeatherStat[]}
      monthlyRatings={(monthlyRatingsRaw ?? []) as MonthlyRating[]}
      initialVitrineFlavours={(vitrineFlavoursRaw ?? []) as VitrineFlavour[]}
      initialVitrineLog={(vitrineLogRaw ?? []) as VitrineVisibilityLogRow[]}
      flavourInsights={flavourInsightsRows}
    />
  );
}
