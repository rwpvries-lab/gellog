/** Open-Meteo WMO weathercode → emoji (aligned with log form weather helper). */
export function weatherCodeToEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code >= 1 && code <= 3) return "⛅️";
  if (code === 45 || code === 48) return "🌫️";
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) return "🌧️";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "🌡️";
}

export type DayPartSegment = {
  label: string;
  emoji: string;
  tempC: number;
};

export type DailyForecastRow = {
  dateIso: string;
  dayLabel: string;
  emoji: string;
  maxC: number;
  minC: number;
};

export type SalonDashboardWeatherPayload = {
  segments: DayPartSegment[];
  daily: DailyForecastRow[];
};

type OpenMeteoJson = {
  timezone?: string;
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    weathercode: (number | null)[];
  };
  daily?: {
    time: string[];
    weathercode: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
  };
};

function hourFromLocalIso(time: string): number {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):/.exec(time);
  return m ? parseInt(m[2]!, 10) : 12;
}

function dayPartForHour(h: number): "night" | "morning" | "afternoon" | "evening" | null {
  if (h >= 0 && h < 6) return "night";
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 24) return "evening";
  return null;
}

function nextDateIso(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function formatDayLabel(dateIso: string, timeZone: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(d);
}

/**
 * Fetches forecast for the salon dashboard card (hourly buckets today + 3 daily rows).
 */
export async function fetchSalonDashboardWeather(
  lat: number,
  lng: number,
): Promise<SalonDashboardWeatherPayload | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("hourly", "temperature_2m,weathercode");
  url.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("forecast_days", "4");
  url.searchParams.set("timezone", "auto");

  let res: Response;
  try {
    res = await fetch(url.toString(), { next: { revalidate: 900 } });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const json = (await res.json()) as OpenMeteoJson;
  const tz = json.timezone ?? "UTC";
  const hourly = json.hourly;
  const daily = json.daily;

  if (
    !hourly?.time?.length ||
    !hourly.temperature_2m?.length ||
    !hourly.weathercode?.length ||
    !daily?.time?.length ||
    !daily.weathercode?.length ||
    !daily.temperature_2m_max?.length ||
    !daily.temperature_2m_min?.length
  ) {
    return null;
  }

  const firstDate = hourly.time[0]!.slice(0, 10);
  const buckets: Record<string, { temps: number[]; codes: number[] }> = {
    night: { temps: [], codes: [] },
    morning: { temps: [], codes: [] },
    afternoon: { temps: [], codes: [] },
    evening: { temps: [], codes: [] },
  };

  const nextDay = nextDateIso(firstDate);

  for (let i = 0; i < hourly.time.length; i++) {
    const t = hourly.time[i]!;
    const datePart = t.slice(0, 10);
    const h = hourFromLocalIso(t);
    if (datePart === firstDate) {
      const part = dayPartForHour(h);
      if (!part) continue;
      const temp = hourly.temperature_2m[i];
      const code = hourly.weathercode[i];
      if (temp == null || code == null) continue;
      buckets[part].temps.push(temp);
      buckets[part].codes.push(code);
    } else if (datePart === nextDay && h >= 0 && h < 6) {
      const temp = hourly.temperature_2m[i];
      const code = hourly.weathercode[i];
      if (temp == null || code == null) continue;
      buckets.night.temps.push(temp);
      buckets.night.codes.push(code);
    } else if (datePart > nextDay) {
      break;
    }
  }

  const order: { key: keyof typeof buckets; label: string }[] = [
    { key: "morning", label: "Morning" },
    { key: "afternoon", label: "Afternoon" },
    { key: "evening", label: "Evening" },
    { key: "night", label: "Night" },
  ];

  const segments: DayPartSegment[] = [];
  for (const { key, label } of order) {
    const b = buckets[key];
    if (b.temps.length === 0) continue;
    const avg =
      b.temps.reduce((a, x) => a + x, 0) / b.temps.length;
    const midCode = b.codes[Math.floor(b.codes.length / 2)] ?? b.codes[0] ?? 0;
    segments.push({
      label,
      emoji: weatherCodeToEmoji(midCode),
      tempC: Math.round(avg * 10) / 10,
    });
  }

  const dailyRows: DailyForecastRow[] = [];
  const n = Math.min(3, daily.time.length);
  for (let i = 0; i < n; i++) {
    const dateIso = daily.time[i]!;
    const maxT = daily.temperature_2m_max[i];
    const minT = daily.temperature_2m_min[i];
    const code = daily.weathercode[i];
    if (maxT == null || minT == null || code == null) continue;
    dailyRows.push({
      dateIso,
      dayLabel: formatDayLabel(dateIso, tz),
      emoji: weatherCodeToEmoji(code),
      maxC: Math.round(maxT * 10) / 10,
      minC: Math.round(minT * 10) / 10,
    });
  }

  if (segments.length === 0 && dailyRows.length === 0) return null;

  return { segments, daily: dailyRows };
}
