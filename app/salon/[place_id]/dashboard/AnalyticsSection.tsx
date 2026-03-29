"use client";

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WeeklyVisit = { week: string; visits: number };
export type TopFlavour = { flavour_name: string; count: number; avg_rating: number };
export type WeatherStat = { weather_condition: string; visits: number };
export type MonthlyRating = { month: string; avg_rating: number };

type Props = {
  tier: "free" | "basic" | "pro";
  placeId: string;
  weeklyVisits: WeeklyVisit[];
  topFlavours: TopFlavour[];
  weatherStats: WeatherStat[];
  monthlyRatings: MonthlyRating[];
};

const WEATHER_EMOJI: Record<string, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  windy: "💨",
  snowy: "❄️",
  stormy: "⛈️",
  foggy: "🌫️",
  hot: "🥵",
};

function weatherEmoji(condition: string) {
  return WEATHER_EMOJI[condition.toLowerCase()] ?? "🌡️";
}

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function formatWeek(week: string) {
  // week is like "2026-03-23"
  const d = new Date(week);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function AnalyticsSection({
  tier,
  placeId,
  weeklyVisits,
  topFlavours,
  weatherStats,
  monthlyRatings,
}: Props) {
  const isBasicOrPro = tier === "basic" || tier === "pro";
  const isPro = tier === "pro";

  if (!isBasicOrPro) {
    return (
      <div className="mb-5 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="px-6 py-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Analytics
          </h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Upgrade to Salon Basic to unlock visit analytics, top flavours, and weather insights.
          </p>

          {/* Blurred placeholder */}
          <div className="relative select-none overflow-hidden rounded-2xl">
            <div className="pointer-events-none blur-sm">
              <div className="mb-3 h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex gap-2">
                {[60, 80, 50, 90, 70].map((w, i) => (
                  <div
                    key={i}
                    className="h-4 rounded-full bg-zinc-200 dark:bg-zinc-700"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 dark:bg-zinc-900/60">
              <SalonUpgradeButtonInline place_id={placeId} tier="basic" label="Upgrade to Salon Basic — €9/mo" className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxFlavourCount = topFlavours[0]?.count ?? 1;

  return (
    <div className="mb-5 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Analytics
      </h2>

      {/* 1. Visits Over Time */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Visits — last 12 weeks
        </p>
        {weeklyVisits.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No visits recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weeklyVisits} barSize={14}>
              <XAxis
                dataKey="week"
                tickFormatter={formatWeek}
                tick={{ fontSize: 9, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                formatter={(v: unknown) => [v, "visits"]}
                labelFormatter={formatWeek}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 10,
                  border: "none",
                  background: "#18181b",
                  color: "#fff",
                }}
              />
              <Bar dataKey="visits" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 2. Top Flavours */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Top flavours
        </p>
        {topFlavours.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No flavour data yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topFlavours.map((f) => (
              <div key={f.flavour_name} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-xs text-zinc-700 dark:text-zinc-300">
                  {f.flavour_name}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-teal-400 dark:bg-teal-500 transition-all"
                    style={{ width: `${Math.round((f.count / maxFlavourCount) * 100)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {f.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Weather Insights */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Weather when people visit
        </p>
        {weatherStats.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No weather data yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weatherStats.map((w) => (
              <span
                key={w.weather_condition}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {weatherEmoji(w.weather_condition)}{" "}
                {w.weather_condition.charAt(0).toUpperCase() + w.weather_condition.slice(1)}{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{w.visits}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4. Rating Trend — Pro only */}
      {isPro ? (
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Rating trend
          </p>
          {monthlyRatings.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={monthlyRatings}>
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 9, fill: "#a1a1aa" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={[0, 5]} />
                <Tooltip
                  formatter={(v: unknown) => [typeof v === "number" ? v.toFixed(2) : v, "avg rating"]}
                  labelFormatter={formatMonth}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 10,
                    border: "none",
                    background: "#18181b",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_rating"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#f97316" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
          <div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Rating trend</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Pro plan only</p>
          </div>
          <SalonUpgradeButtonInline place_id={placeId} tier="pro" label="Upgrade to Pro" className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500" />
        </div>
      )}
    </div>
  );
}

// Inline upgrade button (no useState needed in this sub-component context)
function SalonUpgradeButtonInline({
  place_id,
  tier,
  label,
  className,
}: {
  place_id: string;
  tier: "basic" | "pro";
  label: string;
  className: string;
}) {
  async function handleClick() {
    const res = await fetch("/api/stripe/salon-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id, tier }),
    });
    const data = (await res.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${className}`}
    >
      {label}
    </button>
  );
}
