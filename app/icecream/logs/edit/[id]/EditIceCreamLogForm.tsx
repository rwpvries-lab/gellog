"use client";

import { StarRating } from "@/app/components/RatingStars";
import { SalonInput, type SalonData } from "@/src/components/SalonInput";
import {
  PhotoVisibilityPicker,
  type PhotoVisibility,
} from "@/src/components/PhotoVisibilityPicker";
import { VisibilityPicker, type Visibility } from "@/src/components/VisibilityPicker";
import { createClient } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

type LogFlavourRow = {
  id: string;
  flavour_name: string;
  rating: number | null;
  tags: string[] | null;
  rating_texture: number | null;
  rating_originality: number | null;
  rating_intensity: number | null;
  rating_presentation: number | null;
};

type LogRow = {
  id: string;
  user_id: string;
  salon_name: string;
  salon_place_id: string | null;
  salon_address: string | null;
  salon_lat: number | null;
  salon_lng: number | null;
  salon_city: string | null;
  overall_rating: number;
  notes: string | null;
  photo_url: string | null;
  visited_at: string;
  vessel: "cup" | "cone" | null;
  price_paid: number | null;
  weather_temp: number | null;
  weather_condition: string | null;
  visibility: Visibility;
  photo_visibility?: PhotoVisibility;
  price_hidden_from_others?: boolean;
  log_flavours: LogFlavourRow[];
};

type EditIceCreamLogFormProps = {
  userId: string;
  log: LogRow;
};

type Flavour = {
  id: number;
  name: string;
  rating: number | null;
  tags: string[];
  ratingTexture: number | null;
  ratingOriginality: number | null;
  ratingIntensity: number | null;
  ratingPresentation: number | null;
};

const DIETARY_TAGS = ["Sugar-free", "Dairy-free", "Vegan", "Nut-free", "Gluten-free"];

const STATUS_TAGS: { label: string; icon: string }[] = [
  { label: "Exclusive", icon: "🌟" },
  { label: "Brand New", icon: "🆕" },
  { label: "Leaving Soon", icon: "🔜" },
];

type WeatherData = {
  temperature: number;
  apparentTemperature: number;
  code: number;
  label: string;
  emoji: string;
};

function describeWeatherCode(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "Clear sky", emoji: "☀️" };
  if (code >= 1 && code <= 3) return { label: "Partly cloudy", emoji: "⛅️" };
  if (code === 45 || code === 48) return { label: "Foggy", emoji: "🌫️" };
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) return { label: "Rainy", emoji: "🌧️" };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { label: "Snowy", emoji: "❄️" };
  if (code >= 80 && code <= 82) return { label: "Showers", emoji: "🌦️" };
  if (code >= 95 && code <= 99) return { label: "Thunderstorm", emoji: "⛈️" };
  return { label: "Mixed conditions", emoji: "🌡️" };
}

const MINUTE_STEPS = [0, 15, 30, 45];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildVisitedAt(dateStr: string, hour: number, minute: number): string {
  const proposed = `${dateStr}T${pad(hour)}:${pad(minute)}`;
  const today = todayDateStr();
  if (dateStr === today) {
    const now = new Date();
    const nowStr = `${today}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (proposed > nowStr) return nowStr;
  }
  return proposed;
}

function parseDateStr(isoDate: string): { dateStr: string; hour: number; minute: number } {
  const d = new Date(isoDate);
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hour = d.getHours();
  const minute = Math.floor(d.getMinutes() / 15) * 15;
  return { dateStr, hour, minute };
}

function getLast30Days(): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const label =
      i === 0 ? "Today"
      : i === 1 ? "Yesterday"
      : `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
    result.push({ value: dateStr, label });
  }
  return result;
}

function formatTriggerLabel(visitedAtStr: string): string {
  const [datePart, timePart] = visitedAtStr.split("T");
  const time = timePart.slice(0, 5);
  const today = todayDateStr();
  if (datePart === today) return `Today at ${time}`;
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = `${yd.getFullYear()}-${pad(yd.getMonth() + 1)}-${pad(yd.getDate())}`;
  if (datePart === yesterday) return `Yesterday at ${time}`;
  const d = new Date(datePart + "T12:00:00");
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} at ${time}`;
}

function isToday(datetimeLocalValue: string): boolean {
  return datetimeLocalValue.startsWith(todayDateStr());
}

const DRUM_ITEM_H = 44;
const DRUM_VISIBLE = 5;

function ScrollDrum({
  items,
  selectedValue,
  onChange,
}: {
  items: { value: string; label: string }[];
  selectedValue: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialIdx = Math.max(0, items.findIndex((item) => item.value === selectedValue));
  const [centerIdx, setCenterIdx] = useState(initialIdx);

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = initialIdx * DRUM_ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    if (!ref.current) return;
    const raw = ref.current.scrollTop / DRUM_ITEM_H;
    const clamped = Math.max(0, Math.min(items.length - 1, Math.round(raw)));
    setCenterIdx(clamped);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!ref.current) return;
      const finalIdx = Math.max(0, Math.min(items.length - 1, Math.round(ref.current.scrollTop / DRUM_ITEM_H)));
      const targetTop = finalIdx * DRUM_ITEM_H;
      if (Math.abs(ref.current.scrollTop - targetTop) > 0.5) {
        ref.current.scrollTo({ top: targetTop, behavior: "smooth" });
      }
      setCenterIdx(finalIdx);
      onChange(items[finalIdx].value);
    }, 150);
  }

  const containerH = DRUM_ITEM_H * DRUM_VISIBLE;
  const padH = DRUM_ITEM_H * Math.floor(DRUM_VISIBLE / 2);
  const fadePct = Math.round((padH / containerH) * 100);

  return (
    <div style={{ position: "relative", height: containerH, flex: 1 }}>
      <div style={{ position: "absolute", top: padH, left: 0, right: 0, height: DRUM_ITEM_H, background: "var(--color-orange-bg)", pointerEvents: "none", zIndex: 0 }} />
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          position: "absolute", inset: 0, overflowY: "scroll", scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
          maskImage: `linear-gradient(to bottom, transparent 0%, black ${fadePct}%, black ${100 - fadePct}%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${fadePct}%, black ${100 - fadePct}%, transparent 100%)`,
          background: "transparent", zIndex: 1,
        }}
      >
        <div style={{ height: padH, flexShrink: 0 }} />
        {items.map((item, i) => (
          <div
            key={item.value}
            style={{
              height: DRUM_ITEM_H, scrollSnapAlign: "center", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: centerIdx === i ? 22 : 20, fontWeight: centerIdx === i ? 500 : 400,
              color: "var(--color-text-primary)", userSelect: "none",
            }}
          >
            {item.label}
          </div>
        ))}
        <div style={{ height: padH, flexShrink: 0 }} />
      </div>
      <div style={{ position: "absolute", top: padH, left: 0, right: 0, height: 1, background: "var(--color-orange)", pointerEvents: "none", zIndex: 2 }} />
      <div style={{ position: "absolute", top: padH + DRUM_ITEM_H, left: 0, right: 0, height: 1, background: "var(--color-orange)", pointerEvents: "none", zIndex: 2 }} />
    </div>
  );
}

export function EditIceCreamLogForm({ userId, log }: EditIceCreamLogFormProps) {
  const router = useRouter();

  const parsed = parseDateStr(log.visited_at);

  const [salonName, setSalonName] = useState(log.salon_name);
  const [salonPlaceId, setSalonPlaceId] = useState<string | null>(log.salon_place_id);
  const [salonAddress, setSalonAddress] = useState<string | null>(log.salon_address);
  const [salonLat, setSalonLat] = useState<number | null>(log.salon_lat);
  const [salonLng, setSalonLng] = useState<number | null>(log.salon_lng);
  const [salonCity, setSalonCity] = useState<string | null>(log.salon_city);

  const [selectedDay, setSelectedDay] = useState(parsed.dateStr);
  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftDay, setDraftDay] = useState(parsed.dateStr);
  const [draftHour, setDraftHour] = useState(parsed.hour);
  const [draftMinute, setDraftMinute] = useState(parsed.minute);

  const [flavours, setFlavours] = useState<Flavour[]>(
    log.log_flavours.length > 0
      ? log.log_flavours.map((f, i) => ({
          id: i + 1,
          name: f.flavour_name,
          rating: f.rating,
          tags: f.tags ?? [],
          ratingTexture: f.rating_texture,
          ratingOriginality: f.rating_originality,
          ratingIntensity: f.rating_intensity,
          ratingPresentation: f.rating_presentation,
        }))
      : [{ id: 1, name: "", rating: null, tags: [], ratingTexture: null, ratingOriginality: null, ratingIntensity: null, ratingPresentation: null }]
  );

  const [overallRating, setOverallRating] = useState<number | null>(log.overall_rating);
  const [vessel, setVessel] = useState<"cup" | "cone" | null>(log.vessel);
  const [pricePaid, setPricePaid] = useState(log.price_paid != null ? String(log.price_paid) : "");
  const [notes, setNotes] = useState(log.notes ?? "");
  const [expandedAdvanced, setExpandedAdvanced] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Weather: carry existing forward, allow re-capture
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherUnavailable, setWeatherUnavailable] = useState(false);
  const [weatherUnsupported, setWeatherUnsupported] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showFlavourPrompt, setShowFlavourPrompt] = useState(false);
  const [priceWarning, setPriceWarning] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(log.visibility ?? "public");
  const [photoVisibility, setPhotoVisibility] = useState<PhotoVisibility>(
    log.photo_visibility ?? "public",
  );
  const [hidePriceFromOthers, setHidePriceFromOthers] = useState(
    log.price_hidden_from_others ?? false,
  );

  const visitedAt = buildVisitedAt(selectedDay, selectedHour, selectedMinute);

  function handlePlaceSelect(data: SalonData) {
    setSalonName(data.salon_name);
    setSalonPlaceId(data.salon_place_id);
    setSalonAddress(data.salon_address);
    setSalonLat(data.salon_lat);
    setSalonLng(data.salon_lng);
    setSalonCity(data.salon_city);
  }

  function openSheet() {
    setDraftDay(selectedDay);
    setDraftHour(selectedHour);
    setDraftMinute(selectedMinute);
    setSheetOpen(true);
  }

  function confirmSheet() {
    setSelectedDay(draftDay);
    setSelectedHour(draftHour);
    setSelectedMinute(draftMinute);
    setSheetOpen(false);
  }

  function addFlavour() {
    setFlavours((prev) => [
      ...prev,
      { id: prev.length + 1, name: "", rating: null, tags: [], ratingTexture: null, ratingOriginality: null, ratingIntensity: null, ratingPresentation: null },
    ]);
  }

  function handleAddFlavour() {
    if (flavours.length >= 3) {
      setShowFlavourPrompt(true);
      return;
    }
    addFlavour();
  }

  function handleRemoveFlavour(id: number) {
    setFlavours((prev) => prev.filter((f) => f.id !== id));
  }

  function toggleAdvanced(id: number) {
    setExpandedAdvanced((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleCaptureWeather() {
    if (weatherLoading) return;
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setWeatherUnsupported(true);
      return;
    }
    setWeatherLoading(true);
    setWeatherUnavailable(false);
    setWeatherUnsupported(false);
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition((pos) => resolve(pos), () => resolve(null), { enableHighAccuracy: false, timeout: 10000 });
    });
    if (!position) { setWeatherUnavailable(true); setWeatherLoading(false); return; }
    const { latitude, longitude } = position.coords;
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", latitude.toString());
      url.searchParams.set("longitude", longitude.toString());
      url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code");
      url.searchParams.set("temperature_unit", "celsius");
      url.searchParams.set("timezone", "auto");
      const response = await fetch(url.toString());
      if (!response.ok) { setWeatherUnavailable(true); return; }
      const data = await response.json();
      const current = data.current;
      if (!current) { setWeatherUnavailable(true); return; }
      const temp = typeof current.temperature_2m === "number" ? current.temperature_2m : null;
      const feels = typeof current.apparent_temperature === "number" ? current.apparent_temperature : null;
      const code = typeof current.weather_code === "number" ? current.weather_code : null;
      if (temp == null || feels == null || code == null) { setWeatherUnavailable(true); return; }
      const { label, emoji } = describeWeatherCode(code);
      setWeather({ temperature: temp, apparentTemperature: feels, code, label, emoji });
      setWeatherUnavailable(false);
    } catch {
      setWeatherUnavailable(true);
    } finally {
      setWeatherLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!overallRating) { setError("Please select an overall rating."); return; }
    const trimmedSalon = salonName.trim();
    if (!trimmedSalon) { setError("Please enter a salon name."); return; }
    const activeFlavours = flavours.map((f) => ({ ...f, name: f.name.trim() })).filter((f) => f.name.length > 0);
    if (activeFlavours.length === 0) { setError("Add at least one flavour."); return; }

    setSubmitting(true);
    const supabase = createClient();

    try {
      const { error: logError } = await supabase
        .from("ice_cream_logs")
        .update({
          salon_name: trimmedSalon,
          salon_place_id: salonPlaceId,
          salon_address: salonAddress,
          salon_lat: salonLat,
          salon_lng: salonLng,
          salon_city: salonCity,
          overall_rating: overallRating,
          notes: notes.trim() || null,
          visited_at: new Date(visitedAt).toISOString(),
          vessel: vessel ?? null,
          price_paid: pricePaid !== "" ? parseFloat(pricePaid.replace(",", ".")) : null,
          price_hidden_from_others: hidePriceFromOthers,
          photo_visibility: log.photo_url ? photoVisibility : "public",
          weather_temp: weather?.temperature ?? log.weather_temp,
          weather_condition: weather
            ? `${weather.emoji} ${weather.label}`
            : log.weather_condition,
          visibility,
        })
        .eq("id", log.id)
        .eq("user_id", userId);

      if (logError) throw logError;

      // Delete and re-insert flavours
      const { error: deleteError } = await supabase
        .from("log_flavours")
        .delete()
        .eq("log_id", log.id);

      if (deleteError) throw deleteError;

      const { error: flavoursError } = await supabase
        .from("log_flavours")
        .insert(
          activeFlavours.map((f) => ({
            log_id: log.id,
            flavour_name: f.name,
            rating: f.rating,
            tags: f.tags.length > 0 ? f.tags : null,
            rating_texture: f.ratingTexture,
            rating_originality: f.ratingOriginality,
            rating_intensity: f.ratingIntensity,
            rating_presentation: f.ratingPresentation,
          }))
        );

      if (flavoursError) throw flavoursError;

      router.push("/icecream/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card-sm)]"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[color:var(--color-text-primary)]">Edit scoop</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">Update your ice cream adventure.</p>
      </div>

      {error ? (
        <p className="rounded-2xl bg-[color:var(--color-error-surface)] px-4 py-3 text-sm text-[color:var(--color-error)] ring-1 ring-[color:var(--color-error-border)]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {/* Salon name */}
        <div className="flex flex-col gap-1">
          <label htmlFor="salon-name" className="text-sm font-medium text-[color:var(--color-text-primary)]">
            Salon name
          </label>
          <SalonInput value={salonName} onPlaceSelect={handlePlaceSelect} userId={userId} />
        </div>

        {/* Date/time */}
        <button
          type="button"
          onClick={openSheet}
          className="flex w-full items-center gap-3 rounded-2xl bg-[color:var(--color-surface-alt)] px-4 py-3 text-left text-sm text-[color:var(--color-text-primary)] ring-1 ring-[color:var(--color-border)] transition hover:brightness-95 dark:hover:brightness-110"
        >
          <span className="text-base leading-none">🕐</span>
          <span className="flex-1">{formatTriggerLabel(visitedAt)}</span>
          <span className="text-[color:var(--color-text-tertiary)]">›</span>
        </button>

        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-[color:var(--color-backdrop)]" onClick={() => setSheetOpen(false)} />
            <div className="relative rounded-t-[20px] bg-[color:var(--color-surface)] shadow-2xl ring-1 ring-[color:var(--color-border)]">
              <div className="flex items-center justify-between px-5 py-4">
                <button type="button" onClick={() => setSheetOpen(false)} className="text-sm text-[color:var(--color-text-secondary)]">Cancel</button>
                <button type="button" onClick={confirmSheet} className="text-sm font-semibold text-[color:var(--color-orange)]">Done</button>
              </div>
              <div className="flex pb-8">
                <ScrollDrum items={getLast30Days()} selectedValue={draftDay} onChange={setDraftDay} />
                <ScrollDrum
                  items={Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: pad(i) }))}
                  selectedValue={String(draftHour)}
                  onChange={(v) => setDraftHour(Number(v))}
                />
                <ScrollDrum
                  items={MINUTE_STEPS.map((m) => ({ value: String(m), label: pad(m) }))}
                  selectedValue={String(draftMinute)}
                  onChange={(v) => setDraftMinute(Number(v))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Weather */}
        <div className="flex flex-col gap-2">
          {!isToday(visitedAt) ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">No weather data available for past visits</p>
          ) : weather ? (
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-teal-100/90 px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200 dark:bg-teal-900/40 dark:text-teal-100 dark:ring-teal-800">
              <span className="text-sm leading-none">✓</span>
              <span>{weather.emoji}</span>
              <span>{Math.round(weather.temperature)}°C · Feels like {Math.round(weather.apparentTemperature)}°C · {weather.label}</span>
            </div>
          ) : log.weather_condition && !weatherLoading ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <span>Saved:</span>
                <span>{log.weather_condition}</span>
                {log.weather_temp != null ? <span>· {Math.round(log.weather_temp)}°C</span> : null}
              </div>
              <button
                type="button"
                onClick={handleCaptureWeather}
                className="text-xs font-medium text-teal-700 underline underline-offset-2 dark:text-teal-400"
              >
                Re-capture
              </button>
            </div>
          ) : weatherLoading ? (
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-300 border-t-sky-600" />
              <span>Fetching weather...</span>
            </div>
          ) : weatherUnsupported ? (
            <p className="text-xs text-zinc-500">Location not supported on this browser</p>
          ) : weatherUnavailable ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-zinc-500">⚠️ Weather unavailable</p>
              <button type="button" onClick={handleCaptureWeather} className="text-xs font-medium text-teal-700 underline underline-offset-2">Retry</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCaptureWeather}
              className="inline-flex items-center justify-center self-start rounded-full bg-teal-100 px-4 py-2 text-sm font-medium text-teal-800 ring-1 ring-teal-200 transition hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              Tap to capture weather 🌤️
            </button>
          )}
        </div>

        {/* Flavours */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-orange-100 backdrop-blur dark:bg-zinc-900/70 dark:ring-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Flavours</h2>
              <p className="text-xs text-zinc-500">Add each scoop and rate it.</p>
            </div>
            <button
              type="button"
              onClick={handleAddFlavour}
              className="inline-flex items-center justify-center rounded-full bg-orange-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              + Add flavour
            </button>
          </div>

          {showFlavourPrompt ? (
            <div className="rounded-2xl bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200 dark:bg-zinc-800/60 dark:ring-zinc-700">
              <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                That&apos;s already quite a lot of gelato 🍦 — are you sure you want to add another flavour?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { addFlavour(); setShowFlavourPrompt(false); }}
                  className="rounded-full bg-orange-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-orange-700"
                >
                  Yes, add it
                </button>
                <button
                  type="button"
                  onClick={() => setShowFlavourPrompt(false)}
                  className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            {flavours.map((flavour, index) => (
              <div key={flavour.id} className="flex flex-col gap-2 rounded-2xl bg-orange-50/60 p-3 ring-1 ring-orange-100 dark:bg-zinc-900/80 dark:ring-zinc-700">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={flavour.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFlavours((prev) => prev.map((item) => item.id === flavour.id ? { ...item, name: value } : item));
                    }}
                    placeholder={`Flavour ${index + 1} (e.g. Stracciatella)`}
                    className="flex-1 rounded-xl border border-orange-100 bg-white/80 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
                  />
                  {flavours.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveFlavour(flavour.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-red-500 ring-1 ring-red-200 transition hover:bg-red-50 dark:bg-zinc-900 dark:ring-zinc-700 dark:text-red-400"
                      aria-label="Remove flavour"
                    >
                      ×
                    </button>
                  ) : null}
                </div>

                <StarRating
                  id={`flavour-${flavour.id}-rating`}
                  label="Flavour rating"
                  value={flavour.rating}
                  onChange={(value) => setFlavours((prev) => prev.map((item) => item.id === flavour.id ? { ...item, rating: value } : item))}
                />

                <button
                  type="button"
                  onClick={() => toggleAdvanced(flavour.id)}
                  className="self-start text-xs font-medium text-teal-700 dark:text-teal-400"
                >
                  {expandedAdvanced.has(flavour.id) ? "− Rate in more detail" : "+ Rate in more detail"}
                </button>

                <div className="grid transition-all duration-300" style={{ gridTemplateRows: expandedAdvanced.has(flavour.id) ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 pt-1">
                      {(
                        [
                          { key: "ratingTexture", label: "Textuur (Texture)" },
                          { key: "ratingOriginality", label: "Originaliteit (Originality)" },
                          { key: "ratingIntensity", label: "Intensiteit (Intensity)" },
                          { key: "ratingPresentation", label: "Presentatie (Presentation)" },
                        ] as const
                      ).map(({ key, label }) => (
                        <StarRating
                          key={key}
                          id={`flavour-${flavour.id}-${key}`}
                          label={label}
                          value={flavour[key]}
                          onChange={(value) => setFlavours((prev) => prev.map((item) => item.id === flavour.id ? { ...item, [key]: value } : item))}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {DIETARY_TAGS.map((tag) => {
                    const selected = flavour.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setFlavours((prev) =>
                            prev.map((item) =>
                              item.id === flavour.id
                                ? { ...item, tags: selected ? item.tags.filter((t) => t !== tag) : [...item.tags, tag] }
                                : item
                            )
                          )
                        }
                        className={
                          selected
                            ? "rounded-full px-2.5 py-0.5 text-xs font-medium bg-teal-600 text-white"
                            : "rounded-full px-2.5 py-0.5 text-xs font-medium bg-white text-zinc-500 ring-1 ring-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-600"
                        }
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {STATUS_TAGS.map((tag) => (
                    <span
                      key={tag.label}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 ring-1 ring-orange-200 opacity-40 cursor-default select-none"
                      title="Set by salon operators"
                    >
                      <span>{tag.icon}</span>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <StarRating
          id="log-overall-visit-rating"
          label="Overall visit rating"
          value={overallRating}
          onChange={(value) => setOverallRating(value)}
        />

        {/* Vessel */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Vessel</span>
          <div className="flex gap-3">
            {(
              [
                { value: "cone", emoji: "🍦", label: "Hoorntje" },
                { value: "cup", emoji: "🍧", label: "Bakje" },
              ] as const
            ).map(({ value, emoji, label }) => {
              const selected = vessel === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVessel(selected ? null : value)}
                  className={
                    selected
                      ? "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition bg-[#D97706] text-white"
                      : "flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1">
          <label htmlFor="price-paid" className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            Price paid (optional)
          </label>
          <div className="flex items-center rounded-2xl border border-orange-100 bg-white/80 shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-300 dark:border-zinc-700 dark:bg-zinc-900/70">
            <span className="pl-3 text-sm text-zinc-400">€</span>
            <input
              id="price-paid"
              type="text"
              inputMode="decimal"
              value={pricePaid}
              onChange={(e) => { setPricePaid(e.target.value); setPriceWarning(null); }}
              onBlur={() => {
                const val = parseFloat(pricePaid.replace(",", "."));
                if (!isNaN(val) && val >= 20) setPriceWarning(val >= 100 ? val / 100 : val / 10);
              }}
              placeholder="0.00"
              className="w-full rounded-2xl bg-transparent px-2 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100"
            />
          </div>
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={hidePriceFromOthers}
              onChange={(e) => setHidePriceFromOthers(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-600"
            />
            <span>Hide this price from other people (only you will see it)</span>
          </label>
          {priceWarning != null ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                That seems high — did you mean €{priceWarning.toFixed(2)}? Gelato usually costs a few euros.
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setPricePaid(priceWarning.toFixed(2)); setPriceWarning(null); }}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Yes, use €{priceWarning.toFixed(2)}
                </button>
                <button
                  type="button"
                  onClick={() => setPriceWarning(null)}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  No, keep €{pricePaid}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {log.photo_url ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              Who can see this photo?
            </span>
            <PhotoVisibilityPicker
              value={photoVisibility}
              onChange={setPhotoVisibility}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Followers are people who follow you on Gellog.
            </p>
          </div>
        ) : null}

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Sunny terrace, friendly staff, maybe a waffle on the side…"
            className="w-full rounded-2xl border border-orange-100 bg-white/80 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          Visibility
        </label>
        <VisibilityPicker value={visibility} onChange={setVisibility} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-orange-600 px-6 text-sm font-semibold text-white transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
