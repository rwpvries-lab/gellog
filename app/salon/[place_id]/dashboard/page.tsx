import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import type { Flavour, Suggestion } from "./FlavourBoard";

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
  searchParams: Promise<{ claimed?: string }>;
}) {
  const { place_id } = await params;
  const { claimed } = await searchParams;
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

  const [
    { data: logsData },
    { data: flavourData },
    { count: monthCount },
    { data: salonFlavoursData },
    { data: suggestionsData },
  ] = await Promise.all([
    supabase
      .from("ice_cream_logs")
      .select("overall_rating")
      .eq("salon_place_id", place_id),
    supabase
      .from("log_flavours")
      .select("flavour_name, ice_cream_logs!inner(salon_place_id)")
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

  return (
    <DashboardClient
      salonProfile={salonProfile}
      stats={stats}
      justClaimed={claimed === "1"}
      initialFlavours={(salonFlavoursData ?? []) as Flavour[]}
      initialSuggestions={(suggestionsData ?? []) as Suggestion[]}
    />
  );
}
