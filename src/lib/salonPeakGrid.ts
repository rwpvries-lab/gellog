import "server-only";
import { createClient } from "@/src/lib/supabase/server";
import type { DayKey, WeekHours } from "@/src/lib/opening-hours";

export const PEAK_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] as const;
export const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const HOUR_LABELS = PEAK_HOURS.map((h) => String(h).padStart(2, "0"));

// PostgreSQL extract(dow) → 0=Sun, 1=Mon, ..., 6=Sat
// Grid row → 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
const SQL_DOW_TO_GRID_ROW = [6, 0, 1, 2, 3, 4, 5]; // index = SQL DOW

const GRID_ROW_TO_DAY_KEY: DayKey[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

export type PeakGridPayload = {
  grid: (number | null)[][];
  dow_labels: readonly string[];
  hour_labels: string[];
  generated_at: string;
  total_count: number;
};

type OpenMeteoCurrentJson = {
  current?: { temperature_2m?: number; weathercode?: number };
};

async function fetchCurrentWeather(
  lat: number,
  lng: number,
): Promise<{ temp: number; code: number } | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("current", "temperature_2m,weathercode");
  url.searchParams.set("timezone", "auto");
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const json = (await res.json()) as OpenMeteoCurrentJson;
    const temp = json.current?.temperature_2m;
    const code = json.current?.weathercode;
    if (temp == null || code == null) return null;
    return { temp, code };
  } catch {
    return null;
  }
}

function weatherMultiplier(temp: number, code: number): number {
  if (code >= 51) return 0.3; // rain / snow
  if (temp > 22 && code <= 1) return 1.3; // hot + sunny
  if (temp >= 16) return 1.0; // warm
  if (temp >= 10) return 0.7; // cool
  return 0.4; // cold
}

function hourOpen(dayHours: WeekHours[DayKey], h: number): boolean {
  if (dayHours.closed) return false;
  const openH = parseInt(dayHours.open.split(":")[0]!, 10);
  const closeH = parseInt(dayHours.close.split(":")[0]!, 10);
  return h >= openH && h < closeH;
}

type DensityRow = {
  salon_place_id: string;
  dow: number;
  hour: number;
  log_count: number;
};

type TotalRow = {
  salon_place_id: string;
  total_count: number;
};

type ProfileRow = {
  salon_lat: number | null;
  salon_lng: number | null;
  hours_override: WeekHours | null;
  hours_google: WeekHours | null;
};

export async function computeSalonPeakGrid(
  placeId: string,
): Promise<PeakGridPayload> {
  const supabase = await createClient();

  const [densityResult, totalResult, profileResult] = await Promise.all([
    supabase
      .from("salon_hourly_density")
      .select("salon_place_id,dow,hour,log_count")
      .eq("salon_place_id", placeId),
    supabase
      .from("salon_total_logs_90d")
      .select("salon_place_id,total_count")
      .eq("salon_place_id", placeId)
      .maybeSingle(),
    supabase
      .from("salon_profiles")
      .select("salon_lat,salon_lng,hours_override,hours_google")
      .eq("place_id", placeId)
      .maybeSingle<ProfileRow>(),
  ]);

  const densityRows = (densityResult.data ?? []) as DensityRow[];
  const totalCount = Number((totalResult.data as TotalRow | null)?.total_count ?? 0);
  const profile = profileResult.data ?? null;

  // Build density lookup: "gridRow,colIdx" → log_count
  const densityMap = new Map<string, number>();
  let maxCell = 0;
  for (const row of densityRows) {
    const gridRow = SQL_DOW_TO_GRID_ROW[row.dow];
    if (gridRow == null) continue;
    const colIdx = PEAK_HOURS.indexOf(row.hour as (typeof PEAK_HOURS)[number]);
    if (colIdx === -1) continue;
    const count = Number(row.log_count);
    densityMap.set(`${gridRow},${colIdx}`, count);
    if (count > maxCell) maxCell = count;
  }

  // Weather multiplier
  let multiplier = 1.0;
  const lat = profile?.salon_lat != null ? Number(profile.salon_lat) : NaN;
  const lng = profile?.salon_lng != null ? Number(profile.salon_lng) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const w = await fetchCurrentWeather(lat, lng);
    if (w) multiplier = weatherMultiplier(w.temp, w.code);
  }

  const hours: WeekHours | null =
    profile?.hours_override ?? profile?.hours_google ?? null;

  // Build 7×14 grid
  const grid: (number | null)[][] = Array.from({ length: 7 }, () =>
    new Array<number | null>(14).fill(null),
  );

  for (let row = 0; row < 7; row++) {
    const dayKey = GRID_ROW_TO_DAY_KEY[row]!;
    const dayHours = hours?.[dayKey] ?? null;

    for (let col = 0; col < 14; col++) {
      const h = PEAK_HOURS[col]!;

      if (dayHours && !hourOpen(dayHours, h)) {
        grid[row]![col] = null; // closed
        continue;
      }

      const logCount = densityMap.get(`${row},${col}`) ?? 0;
      const baseScore = maxCell > 0 ? (logCount / maxCell) * 100 : 0;
      grid[row]![col] = Math.min(100, Math.round(baseScore * multiplier));
    }
  }

  return {
    grid,
    dow_labels: DOW_LABELS,
    hour_labels: HOUR_LABELS,
    generated_at: new Date().toISOString(),
    total_count: totalCount,
  };
}
