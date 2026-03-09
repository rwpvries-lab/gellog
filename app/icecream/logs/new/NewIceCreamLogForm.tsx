"use client";

import { StarRating } from "@/app/components/RatingStars";
import { createClient } from "@/src/lib/supabase/client";
import { useLayoutEffect, useRef, useState } from "react";

type NewIceCreamLogFormProps = {
  userId: string;
};

type Flavour = {
  id: number;
  name: string;
  rating: number | null;
  tags: string[];
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
  if (code === 0) {
    return { label: "Clear sky", emoji: "☀️" };
  }
  if (code >= 1 && code <= 3) {
    return { label: "Partly cloudy", emoji: "⛅️" };
  }
  if (code === 45 || code === 48) {
    return { label: "Foggy", emoji: "🌫️" };
  }
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) {
    return { label: "Rainy", emoji: "🌧️" };
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return { label: "Snowy", emoji: "❄️" };
  }
  if (code >= 80 && code <= 82) {
    return { label: "Showers", emoji: "🌦️" };
  }
  if (code >= 95 && code <= 99) {
    return { label: "Thunderstorm", emoji: "⛈️" };
  }
  return { label: "Mixed conditions", emoji: "🌡️" };
}

const MINUTE_STEPS = [0, 15, 30, 45];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultHour(): number {
  return new Date().getHours();
}

function defaultMinute(): number {
  return Math.floor(new Date().getMinutes() / 15) * 15;
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type DrumItem = { value: string; label: string };

function getLast30Days(): DrumItem[] {
  const result: DrumItem[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const label =
      i === 0
        ? "Today"
        : i === 1
        ? "Yesterday"
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
  items: DrumItem[];
  selectedValue: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialIdx = Math.max(0, items.findIndex((item) => item.value === selectedValue));
  const [centerIdx, setCenterIdx] = useState(initialIdx);

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = initialIdx * DRUM_ITEM_H;
    }
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
      const finalIdx = Math.max(
        0,
        Math.min(items.length - 1, Math.round(ref.current.scrollTop / DRUM_ITEM_H))
      );
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
      {/* Selection tint */}
      <div
        style={{
          position: "absolute",
          top: padH,
          left: 0,
          right: 0,
          height: DRUM_ITEM_H,
          background: "#FEF3C7",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Scrollable items */}
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          maskImage: `linear-gradient(to bottom, transparent 0%, black ${fadePct}%, black ${100 - fadePct}%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${fadePct}%, black ${100 - fadePct}%, transparent 100%)`,
          background: "transparent",
          zIndex: 1,
        }}
      >
        <div style={{ height: padH, flexShrink: 0 }} />
        {items.map((item, i) => (
          <div
            key={item.value}
            style={{
              height: DRUM_ITEM_H,
              scrollSnapAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: centerIdx === i ? 22 : 20,
              fontWeight: centerIdx === i ? 500 : 400,
              color: "#18181b",
              userSelect: "none",
            }}
          >
            {item.label}
          </div>
        ))}
        <div style={{ height: padH, flexShrink: 0 }} />
      </div>
      {/* Selection lines */}
      <div
        style={{
          position: "absolute",
          top: padH,
          left: 0,
          right: 0,
          height: 1,
          background: "#D97706",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: padH + DRUM_ITEM_H,
          left: 0,
          right: 0,
          height: 1,
          background: "#D97706",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </div>
  );
}

export function NewIceCreamLogForm({ userId }: NewIceCreamLogFormProps) {
  const [salonName, setSalonName] = useState("");
  const [selectedDay, setSelectedDay] = useState(todayDateStr);
  const [selectedHour, setSelectedHour] = useState(defaultHour);
  const [selectedMinute, setSelectedMinute] = useState(defaultMinute);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftDay, setDraftDay] = useState(todayDateStr);
  const [draftHour, setDraftHour] = useState(defaultHour);
  const [draftMinute, setDraftMinute] = useState(defaultMinute);
  const [flavours, setFlavours] = useState<Flavour[]>([
    { id: 1, name: "", rating: null, tags: [] },
  ]);
  const [overallRating, setOverallRating] = useState<number | null>(5);
  const [vessel, setVessel] = useState<"cup" | "cone" | null>(null);
  const [pricePaid, setPricePaid] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherUnavailable, setWeatherUnavailable] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherCaptured, setWeatherCaptured] = useState(false);

  const visitedAt = buildVisitedAt(selectedDay, selectedHour, selectedMinute);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!overallRating) {
      setError("Please select an overall rating.");
      return;
    }

    const trimmedSalon = salonName.trim();
    if (!trimmedSalon) {
      setError("Please enter a salon name.");
      return;
    }

    const activeFlavours = flavours
      .map((flavour) => ({
        ...flavour,
        name: flavour.name.trim(),
      }))
      .filter((flavour) => flavour.name.length > 0);

    if (activeFlavours.length === 0) {
      setError("Add at least one flavour.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();

    try {
      let photoPath: string | null = null;

      if (photoFile) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("You must be logged in to upload a photo.");
        }
        const filePath = `${user.id}/${Date.now()}-${photoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("log-photos")
          .upload(filePath, photoFile);

        if (uploadError) {
          throw uploadError;
        }

        photoPath = uploadData?.path ?? null;
      }

      const {
        data: log,
        error: logError,
      } = await supabase
        .from("ice_cream_logs")
        .insert({
          user_id: userId,
          salon_name: trimmedSalon,
          overall_rating: overallRating,
          notes: notes.trim() || null,
          photo_url: photoPath,
          visited_at: new Date(visitedAt).toISOString(),
          vessel: vessel ?? null,
          price_paid: pricePaid !== "" ? parseFloat(pricePaid.replace(",", ".")) : null,
          weather_temp: weather?.temperature ?? null,
          weather_feels_like: weather?.apparentTemperature ?? null,
          weather_condition: weather
            ? `${weather.emoji} ${weather.label}`
            : null,
        })
        .select("id")
        .single();

      if (logError) {
        throw logError;
      }

      if (activeFlavours.length > 0) {
        const { error: flavoursError } = await supabase
          .from("log_flavours")
          .insert(
            activeFlavours.map((flavour) => ({
              log_id: log.id,
              flavour_name: flavour.name,
              rating: flavour.rating,
              tags: flavour.tags.length > 0 ? flavour.tags : null,
            }))
          );

        if (flavoursError) {
          throw flavoursError;
        }
      }

      setSuccess("Gelogd!");
      setSalonName("");
      setSelectedDay(todayDateStr());
      setSelectedHour(defaultHour());
      setSelectedMinute(defaultMinute());
      setSheetOpen(false);
      setDraftDay(todayDateStr());
      setDraftHour(defaultHour());
      setDraftMinute(defaultMinute());
      setFlavours([{ id: 1, name: "", rating: null, tags: [] }]);
      setOverallRating(5);
      setVessel(null);
      setPricePaid("");
      setPhotoFile(null);
      setNotes("");
      setWeather(null);
      setWeatherUnavailable(false);
      setWeatherLoading(false);
      setWeatherCaptured(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddFlavour() {
    setFlavours((prev) => [
      ...prev,
      { id: prev.length + 1, name: "", rating: null, tags: [] },
    ]);
  }

  function handleRemoveFlavour(id: number) {
    setFlavours((prev) => prev.filter((flavour) => flavour.id !== id));
  }

  async function handleCaptureWeather() {
    if (weatherCaptured || weatherLoading) {
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setWeatherUnavailable(true);
      return;
    }

    setWeatherLoading(true);
    setWeatherUnavailable(false);

    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });

    if (!position) {
      setWeatherUnavailable(true);
      setWeatherLoading(false);
      return;
    }

    const { latitude, longitude } = position.coords;

    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", latitude.toString());
      url.searchParams.set("longitude", longitude.toString());
      url.searchParams.set(
        "current",
        "temperature_2m,apparent_temperature,weather_code"
      );
      url.searchParams.set("temperature_unit", "celsius");
      url.searchParams.set("timezone", "auto");

      const response = await fetch(url.toString());
      if (!response.ok) {
        setWeatherUnavailable(true);
        return;
      }

      const data = await response.json();
      const current = data.current;

      if (!current) {
        setWeatherUnavailable(true);
        return;
      }

      const temp =
        typeof current.temperature_2m === "number"
          ? current.temperature_2m
          : null;
      const feels =
        typeof current.apparent_temperature === "number"
          ? current.apparent_temperature
          : null;
      const code =
        typeof current.weather_code === "number" ? current.weather_code : null;

      if (temp == null || feels == null || code == null) {
        setWeatherUnavailable(true);
        return;
      }

      const { label, emoji } = describeWeatherCode(code);

      setWeather({
        temperature: temp,
        apparentTemperature: feels,
        code,
        label,
        emoji,
      });
      setWeatherCaptured(true);
      setWeatherUnavailable(false);
    } catch {
      // Swallow errors so the form still works even if weather fails.
      setWeatherUnavailable(true);
    } finally {
      setWeatherLoading(false);
    }
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

  function cancelSheet() {
    setSheetOpen(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50 via-white to-teal-50 p-6 shadow-xl shadow-orange-100/60 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-950 dark:to-teal-950/30"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Log a scoop
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Capture your latest ice cream adventure.
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100 dark:bg-red-950/60 dark:text-red-200 dark:ring-red-900/60">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900/60">
          {success}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="salon-name"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-100"
          >
            Salon name
          </label>
          <input
            id="salon-name"
            type="text"
            value={salonName}
            onChange={(e) => setSalonName(e.target.value)}
            placeholder="e.g. Gelateria Roma"
            autoComplete="off"
            className="w-full rounded-2xl border border-orange-100 bg-white/80 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Start typing and we’ll remember your favourites later.
          </p>
        </div>

        {/* Date/time trigger pill */}
        <button
          type="button"
          onClick={openSheet}
          className="flex w-full items-center gap-3 rounded-2xl bg-zinc-100 px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <span className="text-base leading-none">🕐</span>
          <span className="flex-1">{formatTriggerLabel(visitedAt)}</span>
          <span className="text-zinc-400">›</span>
        </button>

        {/* iOS-style bottom sheet */}
        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={cancelSheet}
            />
            <div className="relative rounded-t-[20px] bg-white shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  type="button"
                  onClick={cancelSheet}
                  className="text-sm text-zinc-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSheet}
                  className="text-sm font-semibold text-amber-600"
                >
                  Bevestigen
                </button>
              </div>
              <div className="flex pb-8">
                <ScrollDrum
                  items={getLast30Days()}
                  selectedValue={draftDay}
                  onChange={setDraftDay}
                />
                <ScrollDrum
                  items={Array.from({ length: 24 }, (_, i) => ({
                    value: String(i),
                    label: pad(i),
                  }))}
                  selectedValue={String(draftHour)}
                  onChange={(v) => setDraftHour(Number(v))}
                />
                <ScrollDrum
                  items={MINUTE_STEPS.map((m) => ({
                    value: String(m),
                    label: pad(m),
                  }))}
                  selectedValue={String(draftMinute)}
                  onChange={(v) => setDraftMinute(Number(v))}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!isToday(visitedAt) ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Geen weerdata beschikbaar voor een datum in het verleden
            </p>
          ) : weather ? (
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-teal-100/90 px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200 dark:bg-teal-900/40 dark:text-teal-100 dark:ring-teal-800">
              <span className="text-sm leading-none">✓</span>
              <span>{weather.emoji}</span>
              <span>
                {Math.round(weather.temperature)}°C · Feels like{" "}
                {Math.round(weather.apparentTemperature)}°C · {weather.label}
              </span>
            </div>
          ) : weatherLoading ? (
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-900">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-300 border-t-sky-600 dark:border-sky-800 dark:border-t-sky-200" />
              <span>Fetching weather...</span>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Gellog captures the weather when you save - tap to allow
                location
              </p>
              {weatherUnavailable ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Weather not available - you can still save your log
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleCaptureWeather}
                className="inline-flex items-center justify-center self-start rounded-full bg-teal-100 px-4 py-2 text-sm font-medium text-teal-800 ring-1 ring-teal-200 transition hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:bg-teal-950/50 dark:text-teal-100 dark:ring-teal-800 dark:hover:bg-teal-900/60"
              >
                Tap to capture weather 🌤️
              </button>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-orange-100 backdrop-blur dark:bg-zinc-900/70 dark:ring-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Flavours
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Add each scoop and rate it.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddFlavour}
              className="inline-flex items-center justify-center rounded-full bg-[##FF7F50] px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              + Add flavour
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {flavours.map((flavour, index) => (
              <div
                key={flavour.id}
                className="flex flex-col gap-2 rounded-2xl bg-orange-50/60 p-3 ring-1 ring-orange-100 dark:bg-zinc-900/80 dark:ring-zinc-700"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={flavour.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFlavours((prev) =>
                        prev.map((item) =>
                          item.id === flavour.id ? { ...item, name: value } : item
                        )
                      );
                    }}
                    placeholder={`Flavour ${index + 1} (e.g. Stracciatella)`}
                    className="flex-1 rounded-xl border border-orange-100 bg-white/80 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
                  />
                  {flavours.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveFlavour(flavour.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-zinc-500 shadow-sm ring-1 ring-orange-100 transition hover:text-red-500 dark:bg-zinc-900 dark:ring-zinc-700"
                      aria-label="Remove flavour"
                    >
                      ×
                    </button>
                  ) : null}
                </div>

                <StarRating
                  label="Flavour rating"
                  value={flavour.rating}
                  onChange={(value) =>
                    setFlavours((prev) =>
                      prev.map((item) =>
                        item.id === flavour.id ? { ...item, rating: value } : item
                      )
                    )
                  }
                />

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
                                ? {
                                    ...item,
                                    tags: selected
                                      ? item.tags.filter((t) => t !== tag)
                                      : [...item.tags, tag],
                                  }
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
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:ring-orange-800/50 opacity-40 cursor-default select-none"
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
          label="Overall visit rating"
          value={overallRating}
          onChange={(value) => setOverallRating(value)}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            Vessel
          </span>
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
                      : "flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-500 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="photo"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-100"
          >
            Photo
          </label>
          <label
            htmlFor="photo"
            className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl bg-white/80 px-3 py-2.5 text-sm text-zinc-700 shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-50 dark:bg-zinc-900/70 dark:text-zinc-100 dark:ring-zinc-700"
          >
            <span>
              {photoFile ? photoFile.name : "Add a sunny scoop photo"}
            </span>
            <span className="rounded-full bg-[##00D4A6] px-3 py-1 text-xs font-semibold text-white">
              Choose file
            </span>
            <input
              id="photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPhotoFile(file);
              }}
            />
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Stored in the <code>log-photos</code> bucket.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="price-paid"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-100"
          >
            Price paid (optional)
          </label>
          <div className="flex items-center rounded-2xl border border-orange-100 bg-white/80 shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-300 dark:border-zinc-700 dark:bg-zinc-900/70">
            <span className="pl-3 text-sm text-zinc-400">€</span>
            <input
              id="price-paid"
              type="text"
              inputMode="decimal"
              value={pricePaid}
              onChange={(e) => setPricePaid(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl bg-transparent px-2 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="notes"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-100"
          >
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

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 items-center justify-center rounded-full bg-[##FF7F50] px-6 text-sm font-semibold text-white shadow-lg shadow-orange-300/50 transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-orange-50 disabled:opacity-60 dark:bg-orange-500 dark:shadow-none dark:focus:ring-offset-zinc-950"
      >
        {submitting ? "Scooping…" : "Opslaan"}
      </button>
    </form>
  );
}

