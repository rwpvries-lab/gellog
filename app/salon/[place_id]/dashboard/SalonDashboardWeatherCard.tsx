import type { SalonDashboardWeatherPayload } from "@/src/lib/salonDashboardWeather";

type Props = {
  weather: SalonDashboardWeatherPayload | null;
  hasCoordinates: boolean;
};

export function SalonDashboardWeatherCard({ weather, hasCoordinates }: Props) {
  if (!hasCoordinates) {
    return (
      <section
        className="mb-5 rounded-2xl bg-white px-4 py-4 shadow-sm ring-2 ring-teal-100 dark:bg-zinc-900 dark:ring-teal-900/50"
        aria-label="Weather"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Weather – plan your vitrine
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Add your salon location (latitude and longitude) on your public profile so we can show a
          local forecast here.
        </p>
      </section>
    );
  }

  if (!weather) {
    return (
      <section
        className="mb-5 rounded-2xl bg-white px-4 py-4 shadow-sm ring-2 ring-teal-100 dark:bg-zinc-900 dark:ring-teal-900/50"
        aria-label="Weather"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Weather – plan your vitrine
        </h2>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Forecast unavailable right now. Please try again later.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mb-5 rounded-2xl bg-white px-4 py-4 shadow-sm ring-2 ring-teal-100 dark:bg-zinc-900 dark:ring-teal-900/50"
      aria-label="Weather forecast"
    >
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Weather – plan your vitrine
      </h2>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        Open-Meteo · local time
      </p>

      {weather.segments.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Today</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {weather.segments.map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-teal-50/80 px-2.5 py-2 text-center dark:bg-teal-950/40"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
                  {s.label}
                </p>
                <p className="mt-1 text-lg leading-none" aria-hidden>
                  {s.emoji}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {s.tempC}°
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {weather.daily.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Next days</p>
          <ul className="flex flex-col gap-2">
            {weather.daily.map((d) => (
              <li
                key={d.dateIso}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xl leading-none" aria-hidden>
                    {d.emoji}
                  </span>
                  <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {d.dayLabel}
                  </span>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">{d.maxC}°</span>
                  <span className="text-zinc-400"> / </span>
                  <span>{d.minC}°</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
