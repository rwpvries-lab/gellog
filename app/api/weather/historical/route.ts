import { createClient } from "@/src/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// WMO weather interpretation codes → human-readable condition
const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

function wmoCondition(code: number): string {
  return WMO[code] ?? "Mixed conditions";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { lat, lng, iso } = body as { lat?: unknown; lng?: unknown; iso?: unknown };

  if (typeof lat !== "number" || typeof lng !== "number" || typeof iso !== "string") {
    return NextResponse.json({ error: "lat, lng, iso required" }, { status: 400 });
  }

  const visitedMs = new Date(iso).getTime();
  if (Number.isNaN(visitedMs)) {
    return NextResponse.json({ error: "invalid iso" }, { status: 400 });
  }

  const daysAgo = Math.floor((Date.now() - visitedMs) / 86_400_000);
  if (daysAgo < 0 || daysAgo > 7) {
    return NextResponse.json({ error: "date out of range" }, { status: 400 });
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lng.toString());
    url.searchParams.set("hourly", "temperature_2m,weather_code");
    url.searchParams.set("temperature_unit", "celsius");
    // Use UTC so hourly timestamps are directly comparable with the UTC iso
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("past_days", "7");
    url.searchParams.set("forecast_days", "1");

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "weather_unavailable" }, { status: 502 });
    }

    const data = (await response.json()) as {
      hourly?: { time?: string[]; temperature_2m?: number[]; weather_code?: number[] };
    };

    const times = data?.hourly?.time ?? [];
    const temps = data?.hourly?.temperature_2m ?? [];
    const codes = data?.hourly?.weather_code ?? [];

    if (times.length === 0) {
      return NextResponse.json({ error: "weather_unavailable" }, { status: 502 });
    }

    // Find the hourly slot whose timestamp is closest to visitedMs
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      // Open-Meteo UTC times look like "2025-05-17T14:00" — append Z for proper parse
      const slotMs = new Date(times[i] + "Z").getTime();
      const diff = Math.abs(slotMs - visitedMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    const tempC = typeof temps[bestIdx] === "number" ? temps[bestIdx] : null;
    const code = typeof codes[bestIdx] === "number" ? codes[bestIdx] : null;

    if (tempC == null || code == null) {
      return NextResponse.json({ error: "weather_unavailable" }, { status: 502 });
    }

    return NextResponse.json({
      tempC,
      code,
      condition: wmoCondition(code),
      source: "historical",
    });
  } catch {
    return NextResponse.json({ error: "weather_unavailable" }, { status: 502 });
  }
}
