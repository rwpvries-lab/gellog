"use client";

import { Gelato } from "@/src/components/Gelato/Gelato";
import { LocationPermissionBanner } from "@/src/components/LocationPermissionBanner";
import type { Visibility } from "@/src/components/VisibilityPicker";
import { gelatoTokensFromNullableTokens } from "@/src/lib/gelato-tokens";
import { LOCATION_DENIED_USER_MESSAGE } from "@/src/lib/locationMessages";
import { Camera, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LogFlowAction, LogFlowState, WeatherData } from "../logFlowReducer";
import { buildVisitedAt, describeWeatherCode } from "../newLogShared";

const vesselTokens = gelatoTokensFromNullableTokens("cream", "none", "none");

function visibilityShortLabel(v: Visibility): string {
  if (v === "public") return "Public";
  if (v === "friends") return "Friends";
  return "Private";
}

function isVisitToday(dateStr: string): boolean {
  const today = new Date();
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateStr === t;
}

export function Step3_Details({
  state,
  dispatch,
}: {
  state: LogFlowState;
  dispatch: React.Dispatch<LogFlowAction>;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [weatherBanner, setWeatherBanner] = useState<string | null>(null);
  const [weatherAttemptDone, setWeatherAttemptDone] = useState(false);

  const visitedAt = buildVisitedAt(state.step1.date, state.step1.hour, state.step1.minute);
  const todayVisit = isVisitToday(state.step1.date);

  useEffect(() => {
    setWeatherAttemptDone(false);
  }, [todayVisit]);

  useEffect(() => {
    if (!todayVisit) return;
    if (state.step3.weather) return;

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const position = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            (err) => {
              if (err.code === err.PERMISSION_DENIED) {
                setWeatherBanner(LOCATION_DENIED_USER_MESSAGE);
              }
              resolve(null);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
          );
        });

        if (cancelled || !position) {
          return;
        }

        const { latitude, longitude } = position.coords;

        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", latitude.toString());
        url.searchParams.set("longitude", longitude.toString());
        url.searchParams.set(
          "current",
          "temperature_2m,apparent_temperature,weather_code,uv_index",
        );
        url.searchParams.set("temperature_unit", "celsius");
        url.searchParams.set("timezone", "auto");

        const response = await fetch(url.toString());
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const current = data.current;

        if (!current) {
          return;
        }

        const temp =
          typeof current.temperature_2m === "number" ? current.temperature_2m : null;
        const feels =
          typeof current.apparent_temperature === "number"
            ? current.apparent_temperature
            : null;
        const code =
          typeof current.weather_code === "number" ? current.weather_code : null;

        if (temp == null || feels == null || code == null) {
          return;
        }

        const uv =
          typeof current.uv_index === "number" ? current.uv_index : null;

        const { label, emoji } = describeWeatherCode(code);

        const weather: WeatherData = {
          temperature: temp,
          apparentTemperature: feels,
          code,
          label,
          emoji,
          uvIndex: uv,
        };
        dispatch({ type: "SET_WEATHER", weather });
      } catch {
        // ignore
      } finally {
        if (!cancelled) setWeatherAttemptDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayVisit, dispatch, state.step3.weather]);

  function weatherChipText(): string {
    if (!todayVisit) {
      return "Past visit — no snapshot";
    }
    const w = state.step3.weather;
    if (!w) {
      return weatherAttemptDone ? "Weather unavailable" : "Fetching…";
    }
    const t = Math.round(w.temperature);
    const lbl = w.label.toLowerCase();
    return `${w.emoji} ${t}°C, ${lbl}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border-default bg-background-secondary p-4">
        <h2 className="mb-4 font-serif text-[18px] font-medium text-text-primary">How you had it</h2>

        <div className="mb-6 flex flex-col gap-2">
          <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
            Vessel
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: "cone" as const, label: "Cone" },
                { value: "cup" as const, label: "Cup" },
              ] as const
            ).map(({ value, label }) => {
              const selected = state.step3.vessel === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SET_VESSEL",
                      vessel: selected ? null : value,
                    })
                  }
                  className={`flex h-20 flex-row items-center gap-3 overflow-hidden rounded-2xl border px-3 transition-colors ${
                    selected
                      ? "border-brand-primary bg-brand-primary-surface"
                      : "border-border-default bg-background-tertiary"
                  }`}
                  aria-pressed={selected}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <Gelato
                      variant={value}
                      tokens={vesselTokens}
                      size={40}
                      seed={`new-log-${value}`}
                    />
                  </div>
                  <span className="font-sans text-base font-medium text-text-primary">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-2">
          <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
            Photo
          </p>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-default bg-background-primary"
          >
            <Camera className="h-6 w-6 text-brand-primary" strokeWidth={2} aria-hidden />
            <span className="font-sans text-sm text-text-secondary">
              {state.step3.photoFile ? state.step3.photoFile.name : "Tap to add photo"}
            </span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              dispatch({ type: "SET_PHOTO", file });
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
            Notes
          </p>
          <textarea
            value={state.step3.notes}
            onChange={(e) => dispatch({ type: "SET_NOTES", notes: e.target.value })}
            rows={4}
            placeholder="Arrived at 11am to avoid the queue…"
            className="min-h-[96px] w-full resize-none rounded-2xl border border-border-default bg-background-primary px-3 py-3 font-sans text-sm italic text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border-default bg-background-secondary p-4">
        <h2 className="mb-4 font-serif text-[18px] font-medium text-text-primary">Context</h2>

        <LocationPermissionBanner
          message={weatherBanner}
          onDismiss={() => setWeatherBanner(null)}
        />

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
              Visibility
            </p>
            <div className="relative inline-flex items-center self-start">
              <select
                value={state.step3.visibility}
                onChange={(e) =>
                  dispatch({
                    type: "SET_VISIBILITY",
                    visibility: e.target.value as Visibility,
                  })
                }
                className="cursor-pointer appearance-none rounded-full border border-transparent bg-transparent py-1 pl-0 pr-7 font-sans text-sm font-medium text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Visibility"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-primary"
                aria-hidden
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
              Weather
            </p>
            <p className="truncate font-sans text-sm text-text-primary">{weatherChipText()}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
            Price paid
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-[60%] flex-1 items-center rounded-2xl border border-border-default bg-background-primary px-3 py-2 focus-within:border-border-focus">
              <span className="font-sans text-base text-text-tertiary">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={state.step3.priceInput}
                onChange={(e) =>
                  dispatch({
                    type: "SET_PRICE",
                    priceInput: e.target.value,
                    priceWarning: null,
                  })
                }
                onBlur={() => {
                  const val = parseFloat(state.step3.priceInput.replace(",", "."));
                  if (!Number.isNaN(val) && val >= 20)
                    dispatch({
                      type: "SET_PRICE",
                      priceWarning: val >= 100 ? val / 100 : val / 10,
                    });
                }}
                placeholder="0.00"
                className="min-w-0 flex-1 border-none bg-transparent px-2 font-sans text-base text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 font-sans text-[13px] text-text-secondary">
              <input
                type="checkbox"
                checked={state.step3.hidePrice}
                onChange={(e) =>
                  dispatch({ type: "SET_PRICE", hidePrice: e.target.checked })
                }
                className="h-4 w-4 rounded border-border-default accent-[rgb(var(--brand-primary-rgb))]"
              />
              Hide from others
            </label>
          </div>
          {state.step3.priceWarning != null ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
              <p className="text-sm italic text-text-secondary">
                That seems high — did you mean €{state.step3.priceWarning.toFixed(2)}?
              </p>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "SET_PRICE",
                    priceInput: state.step3.priceWarning!.toFixed(2),
                    priceWarning: null,
                  })
                }
                className="rounded-full bg-background-tertiary px-2.5 py-1 text-xs font-medium text-text-primary ring-1 ring-border-default"
              >
                Use €{state.step3.priceWarning.toFixed(2)}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <span className="sr-only" aria-live="polite">
        {visitedAt}
      </span>
    </div>
  );
}
