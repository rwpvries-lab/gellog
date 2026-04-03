import { createClient } from "@/src/lib/supabase/server";
import { MapClient } from "./MapClient";

/** Only allow in-app return paths (avoid open redirects). */
function sanitizePickerReturnTo(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  let path: string;
  try {
    path = decodeURIComponent(raw.trim());
  } catch {
    return null;
  }
  if (!path.startsWith("/")) return null;
  if (path.includes("//")) return null;
  const allowed = new Set(["/icecream/logs/new", "/log"]);
  return allowed.has(path) ? path : null;
}

export type SalonPin = {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  visit_count: number;
  avg_rating: number;
  top_flavours: string[];
};

export type UserSubmittedPin = {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
};

export const revalidate = 60;

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const pickerReturnTo = sanitizePickerReturnTo(returnTo);

  const supabase = await createClient();

  const { data: logsData } = await supabase
    .from("ice_cream_logs")
    .select(
      `salon_place_id, salon_name, salon_lat, salon_lng, overall_rating,
       log_flavours ( flavour_name )`,
    )
    .eq("visibility", "public")
    .not("salon_lat", "is", null)
    .not("salon_lng", "is", null)
    .not("salon_place_id", "is", null);

  // Group by salon and compute stats
  const salonMap = new Map<
    string,
    {
      name: string;
      lat: number;
      lng: number;
      ratings: number[];
      flavourCounts: Record<string, number>;
    }
  >();

  for (const log of logsData ?? []) {
    if (!log.salon_place_id || log.salon_lat == null || log.salon_lng == null)
      continue;

    let salon = salonMap.get(log.salon_place_id);
    if (!salon) {
      salon = {
        name: log.salon_name,
        lat: log.salon_lat,
        lng: log.salon_lng,
        ratings: [],
        flavourCounts: {},
      };
      salonMap.set(log.salon_place_id, salon);
    }

    salon.ratings.push(log.overall_rating);

    for (const f of (log.log_flavours as { flavour_name: string }[]) ?? []) {
      salon.flavourCounts[f.flavour_name] =
        (salon.flavourCounts[f.flavour_name] ?? 0) + 1;
    }
  }

  const salons: SalonPin[] = Array.from(salonMap.entries()).map(
    ([place_id, s]) => ({
      place_id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      visit_count: s.ratings.length,
      avg_rating:
        s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length,
      top_flavours: Object.entries(s.flavourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name),
    }),
  );

  const { data: userSubmittedData } = await supabase
    .from("salon_profiles")
    .select("place_id, salon_name, salon_lat, salon_lng")
    .eq("is_user_submitted", true)
    .not("salon_lat", "is", null)
    .not("salon_lng", "is", null);

  const userSubmittedSalons: UserSubmittedPin[] = (userSubmittedData ?? [])
    .filter((r) => r.salon_lat != null && r.salon_lng != null)
    .map((r) => ({
      place_id: r.place_id,
      name: r.salon_name ?? "Salon",
      lat: r.salon_lat as number,
      lng: r.salon_lng as number,
    }));

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {!pickerReturnTo ? (
        <header className="flex flex-none items-center border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Discover
          </h1>
        </header>
      ) : null}
      <div className="relative flex-1">
        <MapClient
          salons={salons}
          userSubmittedSalons={userSubmittedSalons}
          pickerReturnTo={pickerReturnTo}
        />
      </div>
    </div>
  );
}
