"use client";

import { StarRating } from "@/app/components/RatingStars";
import { SalonInput, type SalonData } from "@/src/components/SalonInput";
import {
  PhotoVisibilityPicker,
  type PhotoVisibility,
} from "@/src/components/PhotoVisibilityPicker";
import { LocationPermissionBanner } from "@/src/components/LocationPermissionBanner";
import { VisibilityPicker, type Visibility } from "@/src/components/VisibilityPicker";
import { VesselIllustration, getFlavourColor } from "@/src/components/VesselIllustration";
import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import { LOCATION_DENIED_USER_MESSAGE } from "@/src/lib/locationMessages";
import { userFacingSaveError } from "@/src/lib/userFacingError";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type NewIceCreamLogFormProps = {
  userId: string;
  defaultVisibility?: Visibility;
  initialSalonData?: SalonData | null;
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

function nextFlavourId(existing: { id: number }[]): number {
  return Math.max(0, ...existing.map((f) => f.id)) + 1;
}

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
  uvIndex: number | null;
};

function uvLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

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
          background: "var(--color-orange-bg)",
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
              color: "var(--color-text-primary)",
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
          background: "var(--color-orange)",
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
          background: "var(--color-orange)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </div>
  );
}

function LogCard({
  children,
  prominent = false,
  className = "",
}: {
  children: React.ReactNode;
  prominent?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-[color:var(--color-surface)] ${
        prominent
          ? "border-2 border-[color:var(--color-orange)] p-6 shadow-[0_10px_40px_color-mix(in_srgb,var(--color-orange)_12%,transparent)]"
          : "border border-[color:var(--color-border)] p-5"
      } ${className}`}
    >
      {children}
    </section>
  );
}

const VITRINE_FALLBACK_COLOUR = "#0D9488";

type VitrineSuggestionRow = { id: string; name: string; colour: string | null };

function vitrinePillColour(colour: string | null | undefined): string {
  const c = colour?.trim();
  return c ? c : VITRINE_FALLBACK_COLOUR;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogSectionHeading({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold tracking-tight text-[color:var(--color-text-primary)]">
        {children}
      </h2>
      {hint ? (
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--color-text-secondary)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function NewIceCreamLogForm({ userId, defaultVisibility = "public", initialSalonData }: NewIceCreamLogFormProps) {
  const router = useRouter();
  const [salonName, setSalonName] = useState(initialSalonData?.salon_name ?? "");
  const [salonPlaceId, setSalonPlaceId] = useState<string | null>(initialSalonData?.salon_place_id ?? null);
  const [salonAddress, setSalonAddress] = useState<string | null>(initialSalonData?.salon_address ?? null);
  const [salonLat, setSalonLat] = useState<number | null>(initialSalonData?.salon_lat ?? null);
  const [salonLng, setSalonLng] = useState<number | null>(initialSalonData?.salon_lng ?? null);
  const [salonCity, setSalonCity] = useState<string | null>(initialSalonData?.salon_city ?? null);
  const [selectedDay, setSelectedDay] = useState(todayDateStr);
  const [selectedHour, setSelectedHour] = useState(defaultHour);
  const [selectedMinute, setSelectedMinute] = useState(defaultMinute);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftDay, setDraftDay] = useState(todayDateStr);
  const [draftHour, setDraftHour] = useState(defaultHour);
  const [draftMinute, setDraftMinute] = useState(defaultMinute);
  const [flavours, setFlavours] = useState<Flavour[]>([
    { id: 1, name: "", rating: null, tags: [], ratingTexture: null, ratingOriginality: null, ratingIntensity: null, ratingPresentation: null },
  ]);
  const [overallRating, setOverallRating] = useState<number | null>(5);
  const [vessel, setVessel] = useState<"cup" | "cone" | null>(null);
  const [pricePaid, setPricePaid] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [expandedAdvanced, setExpandedAdvanced] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherUnavailable, setWeatherUnavailable] = useState(false);
  const [weatherUnsupported, setWeatherUnsupported] = useState(false);
  const [weatherLocationBanner, setWeatherLocationBanner] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showFlavourPrompt, setShowFlavourPrompt] = useState(false);
  const [priceWarning, setPriceWarning] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [photoVisibility, setPhotoVisibility] = useState<PhotoVisibility>("public");
  const [hidePriceFromOthers, setHidePriceFromOthers] = useState(false);
  const [vitrineRows, setVitrineRows] = useState<VitrineSuggestionRow[]>([]);
  const [vitrineLoading, setVitrineLoading] = useState(false);
  const [pendingNamedFlavour, setPendingNamedFlavour] = useState<string | null>(null);

  const visitedAt = buildVisitedAt(selectedDay, selectedHour, selectedMinute);

  useEffect(() => {
    if (!salonPlaceId) {
      setVitrineRows([]);
      setVitrineLoading(false);
      return;
    }

    let cancelled = false;
    setVitrineLoading(true);
    const supabase = createClient();

    void supabase
      .from("vitrine_flavours")
      .select("id,name,colour")
      .eq("salon_place_id", salonPlaceId)
      .eq("is_visible", true)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        setVitrineLoading(false);
        if (error) {
          setVitrineRows([]);
          return;
        }
        setVitrineRows((data ?? []) as VitrineSuggestionRow[]);
      });

    return () => {
      cancelled = true;
    };
  }, [salonPlaceId]);

  function openSalonMapPicker() {
    router.push(`/map?returnTo=${encodeURIComponent("/log")}`);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

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
        const blob = await resizeImageBeforeUpload(photoFile, 1200, 0.85);
        const filePath = `${user.id}/${Date.now()}.webp`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("log-photos")
          .upload(filePath, blob, {
            cacheControl: "3600",
            contentType: "image/webp",
          });

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
          salon_place_id: salonPlaceId,
          salon_address: salonAddress,
          salon_lat: salonLat,
          salon_lng: salonLng,
          salon_city: salonCity,
          overall_rating: overallRating,
          notes: notes.trim() || null,
          photo_url: photoPath,
          visited_at: new Date(visitedAt).toISOString(),
          vessel: vessel ?? null,
          price_paid: pricePaid !== "" ? parseFloat(pricePaid.replace(",", ".")) : null,
          price_hidden_from_others: hidePriceFromOthers,
          photo_visibility: photoVisibility,
          weather_temp: weather?.temperature ?? null,
          weather_feels_like: weather?.apparentTemperature ?? null,
          weather_condition: weather
            ? `${weather.emoji} ${weather.label}`
            : null,
          weather_uv_index: weather?.uvIndex ?? null,
          visibility,
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
              rating_texture: flavour.ratingTexture,
              rating_originality: flavour.ratingOriginality,
              rating_intensity: flavour.ratingIntensity,
              rating_presentation: flavour.ratingPresentation,
            }))
          );

        if (flavoursError) {
          throw flavoursError;
        }
      }

      router.push("/feed");

      // Fire-and-forget: suggest flavours to the salon if it's claimed
      if (salonPlaceId) {
        void (async () => {
          try {
            const { data: salonProfile } = await supabase
              .from("salon_profiles")
              .select("id")
              .eq("place_id", salonPlaceId)
              .maybeSingle();

            if (!salonProfile) return;

            const [{ data: vitrineNames }, { data: legacySalonFlavours }, { data: existingSuggestions }] =
              await Promise.all([
                supabase.from("vitrine_flavours").select("name").eq("salon_place_id", salonPlaceId),
                supabase.from("salon_flavours").select("name").eq("salon_id", salonProfile.id),
                supabase.from("flavour_suggestions").select("name").eq("salon_id", salonProfile.id),
              ]);

            const skipNames = new Set([
              ...(vitrineNames ?? []).map((f: { name: string }) => f.name.toLowerCase()),
              ...(legacySalonFlavours ?? []).map((f: { name: string }) => f.name.toLowerCase()),
              ...(existingSuggestions ?? []).map((f: { name: string }) => f.name.toLowerCase()),
            ]);

            const toSuggest = activeFlavours.filter(
              (f) => !skipNames.has(f.name.toLowerCase())
            );

            if (toSuggest.length === 0) return;

            await supabase.from("flavour_suggestions").insert(
              toSuggest.map((f) => ({
                salon_id: salonProfile.id,
                name: f.name,
                suggested_by: userId,
                status: "pending",
              }))
            );
          } catch {
            // Fire-and-forget — silently ignore failures
          }
        })();
      }
    } catch (err) {
      setError(
        userFacingSaveError(err, "We couldn't save your log. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function addFlavour() {
    setFlavours((prev) => [
      ...prev,
      {
        id: nextFlavourId(prev),
        name: "",
        rating: null,
        tags: [],
        ratingTexture: null,
        ratingOriginality: null,
        ratingIntensity: null,
        ratingPresentation: null,
      },
    ]);
  }

  function flavourNameInForm(trimmedLower: string): boolean {
    return flavours.some((f) => f.name.trim().toLowerCase() === trimmedLower);
  }

  function applyFlavourNameToForm(rawName: string) {
    const trimmed = rawName.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    if (flavourNameInForm(lower)) return;

    const emptyIdx = flavours.findIndex((f) => !f.name.trim());
    if (emptyIdx >= 0) {
      setFlavours((prev) =>
        prev.map((item, i) => (i === emptyIdx ? { ...item, name: trimmed } : item)),
      );
      return;
    }

    if (flavours.length >= 3) {
      setPendingNamedFlavour(trimmed);
      setShowFlavourPrompt(true);
      return;
    }

    setFlavours((prev) => [
      ...prev,
      {
        id: nextFlavourId(prev),
        name: trimmed,
        rating: null,
        tags: [],
        ratingTexture: null,
        ratingOriginality: null,
        ratingIntensity: null,
        ratingPresentation: null,
      },
    ]);
  }

  function handleAddFlavour() {
    if (flavours.length >= 3) {
      setPendingNamedFlavour(null);
      setShowFlavourPrompt(true);
      return;
    }
    addFlavour();
  }

  function handleRemoveFlavour(id: number) {
    setFlavours((prev) => prev.filter((flavour) => flavour.id !== id));
  }

  function toggleAdvanced(id: number) {
    setExpandedAdvanced((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleCaptureWeather() {
    if (weatherLoading) {
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setWeatherUnsupported(true);
      return;
    }

    setWeatherLoading(true);
    setWeatherUnavailable(false);
    setWeatherUnsupported(false);
    setWeatherLocationBanner(null);

    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setWeatherLocationBanner(LOCATION_DENIED_USER_MESSAGE);
          } else {
            setWeatherUnavailable(true);
          }
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
      );
    });

    if (!position) {
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
        "temperature_2m,apparent_temperature,weather_code,uv_index"
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

      const uv =
        typeof current.uv_index === "number" ? current.uv_index : null;

      const { label, emoji } = describeWeatherCode(code);

      setWeather({
        temperature: temp,
        apparentTemperature: feels,
        code,
        label,
        emoji,
        uvIndex: uv,
      });
      setWeatherUnavailable(false);
    } catch {
      // Swallow errors so the form still works even if weather fails.
      setWeatherUnavailable(true);
    } finally {
      setWeatherLoading(false);
    }
  }

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

  function cancelSheet() {
    setSheetOpen(false);
  }

  const inputFocusClass =
    "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal)] focus:border-[color:var(--color-teal)]";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-[color:var(--color-text-primary)]">
          Log a scoop
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">
          Capture your latest ice cream adventure.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl px-4 py-3 text-sm text-[color:var(--color-error)] ring-1 ring-[color:var(--color-error-border)] bg-[color:var(--color-error-surface)]"
        >
          {error}
        </p>
      ) : null}

      <LogCard prominent>
        <LogSectionHeading hint="Search or pick on the map — this is the heart of your log.">
          Salon
        </LogSectionHeading>
        <SalonInput
          value={salonName}
          onPlaceSelect={handlePlaceSelect}
          userId={userId}
          onOpenMap={openSalonMapPicker}
        />
        <p className="mt-3 text-xs leading-relaxed text-[color:var(--color-text-secondary)]">
          Start typing and we’ll remember your favourites later.{" "}
          <button
            type="button"
            onClick={openSalonMapPicker}
            className="font-medium text-[color:var(--color-teal)] underline decoration-[color:color-mix(in_srgb,var(--color-teal)_45%,transparent)] underline-offset-2"
          >
            Choose on map
          </button>
        </p>
      </LogCard>

      {!vitrineLoading && vitrineRows.length > 0 ? (
        <LogCard>
          <h2 className="text-base font-semibold tracking-tight text-[color:var(--color-text-primary)]">
            Today&apos;s flavours at this salon
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {vitrineRows.map((row) => {
              const bg = vitrinePillColour(row.colour);
              const added = flavourNameInForm(row.name.trim().toLowerCase());
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => applyFlavourNameToForm(row.name)}
                  aria-pressed={added}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm ring-1 ring-black/10 transition dark:ring-white/10 ${
                    added ? "opacity-60" : "hover:brightness-110"
                  }`}
                  style={{ backgroundColor: bg }}
                >
                  {added ? <CheckIcon className="shrink-0 opacity-90" /> : null}
                  {row.name}
                </button>
              );
            })}
          </div>
        </LogCard>
      ) : null}

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-[color:var(--color-backdrop)]"
            onClick={cancelSheet}
            aria-hidden
          />
          <div className="relative rounded-t-[20px] bg-[color:var(--color-surface)] shadow-2xl ring-1 ring-[color:var(--color-border)]">
            <div className="flex items-center justify-between px-5 py-4">
              <button
                type="button"
                onClick={cancelSheet}
                className="text-sm text-[color:var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSheet}
                className="text-sm font-semibold text-[color:var(--color-orange)]"
              >
                Done
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
      ) : null}

      <LogCard>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[color:var(--color-text-primary)]">
              Flavours
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--color-text-secondary)]">
              Add each scoop and rate it.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddFlavour}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[color:var(--color-orange)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-on-brand)] shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal)] focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)]"
          >
            + Add flavour
          </button>
        </div>

        {showFlavourPrompt ? (
          <div className="mb-4 rounded-xl bg-[color:var(--color-surface-alt)] px-3 py-3 ring-1 ring-[color:var(--color-border)]">
            <p className="text-sm italic text-[color:var(--color-text-secondary)]">
              That&apos;s already quite a lot of gelato 🍦 — are you sure you want to add another flavour?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pendingNamedFlavour !== null) {
                    const name = pendingNamedFlavour;
                    setPendingNamedFlavour(null);
                    setFlavours((prev) => [
                      ...prev,
                      {
                        id: nextFlavourId(prev),
                        name,
                        rating: null,
                        tags: [],
                        ratingTexture: null,
                        ratingOriginality: null,
                        ratingIntensity: null,
                        ratingPresentation: null,
                      },
                    ]);
                  } else {
                    addFlavour();
                  }
                  setShowFlavourPrompt(false);
                }}
                className="rounded-full bg-[color:var(--color-orange)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-on-brand)] transition hover:brightness-110"
              >
                Yes, add it
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingNamedFlavour(null);
                  setShowFlavourPrompt(false);
                }}
                className="rounded-full bg-[color:var(--color-surface-alt)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-text-primary)] ring-1 ring-[color:var(--color-border)] transition hover:brightness-95 dark:hover:brightness-110"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {flavours.map((flavour, index) => (
            <div
              key={flavour.id}
              className="flex flex-col gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] p-4"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={flavour.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFlavours((prev) =>
                      prev.map((item) =>
                        item.id === flavour.id ? { ...item, name: value } : item,
                      ),
                    );
                  }}
                  placeholder={`Flavour ${index + 1} (e.g. Stracciatella)`}
                  className={`flex-1 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-tertiary)] ${inputFocusClass}`}
                />
                {flavours.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveFlavour(flavour.id)}
                    className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-error)] ring-1 ring-[color:var(--color-error-border)] transition hover:bg-[color:var(--color-error-surface)]"
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
                onChange={(value) =>
                  setFlavours((prev) =>
                    prev.map((item) =>
                      item.id === flavour.id ? { ...item, rating: value } : item,
                    ),
                  )
                }
              />

              <button
                type="button"
                onClick={() => toggleAdvanced(flavour.id)}
                className="self-start text-xs font-medium text-[color:var(--color-teal)]"
              >
                {expandedAdvanced.has(flavour.id)
                  ? "− Rate in more detail"
                  : "+ Rate in more detail"}
              </button>

              <div
                className="grid transition-all duration-300"
                style={{ gridTemplateRows: expandedAdvanced.has(flavour.id) ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-2 pt-1">
                    {(
                      [
                        { key: "ratingTexture" as const, label: "Texture" },
                        { key: "ratingOriginality" as const, label: "Originality" },
                        { key: "ratingIntensity" as const, label: "Intensity" },
                        { key: "ratingPresentation" as const, label: "Presentation" },
                      ] as const
                    ).map(({ key, label }) => (
                      <StarRating
                        key={key}
                        id={`flavour-${flavour.id}-${key}`}
                        label={label}
                        value={flavour[key]}
                        onChange={(value) =>
                          setFlavours((prev) =>
                            prev.map((item) =>
                              item.id === flavour.id ? { ...item, [key]: value } : item,
                            ),
                          )
                        }
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
                              ? {
                                  ...item,
                                  tags: selected
                                    ? item.tags.filter((t) => t !== tag)
                                    : [...item.tags, tag],
                                }
                              : item,
                          ),
                        )
                      }
                      className={
                        selected
                          ? "rounded-full bg-[color:var(--color-teal)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--color-on-brand)]"
                          : `rounded-full bg-[color:var(--color-surface)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--color-text-secondary)] ring-1 ring-[color:var(--color-border)]`
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
                {STATUS_TAGS.map((tag) => (
                  <span
                    key={tag.label}
                    className="inline-flex cursor-default select-none items-center gap-1 rounded-full bg-[color:var(--color-orange-bg)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--color-orange)] opacity-45 ring-1 ring-[color:color-mix(in_srgb,var(--color-orange)_35%,var(--color-border))]"
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
      </LogCard>

      <LogCard>
        <LogSectionHeading hint="How was the visit overall?">Rating</LogSectionHeading>
        <StarRating
          id="log-overall-visit-rating"
          label="Overall visit rating"
          value={overallRating}
          onChange={(value) => setOverallRating(value)}
        />
        <div className="mt-5 rounded-xl border-2 border-[color:var(--color-teal)] bg-[color:var(--color-teal-bg)] p-5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-teal)_18%,transparent)]">
          <p className="mb-4 text-center text-sm font-semibold text-[color:var(--color-text-primary)]">
            Cup or cone?
          </p>
          <div className="flex gap-6">
            {(
              [
                { value: "cone" as const, label: "Cone" },
                { value: "cup" as const, label: "Cup" },
              ] as const
            ).map(({ value, label }) => {
              const isSelected = vessel === value;
              const activeFlavours = flavours
                .filter((f) => f.name.trim().length > 0)
                .slice(0, 3)
                .map((f, i) => ({ name: f.name, colorHex: getFlavourColor(f.name, i) }));
              return (
                <div key={value} className="flex flex-1 flex-col items-center gap-3">
                  <VesselIllustration
                    vessel={value}
                    flavours={activeFlavours}
                    selected={isSelected}
                    size="medium"
                    onClick={() => setVessel(isSelected ? null : value)}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected
                        ? "var(--color-orange)"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </LogCard>

      <LogCard>
        <LogSectionHeading hint="Anything memorable about this visit?">Notes</LogSectionHeading>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Sunny terrace, friendly staff, maybe a waffle on the side…"
          className={`w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] px-3 py-3 text-sm text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-tertiary)] ${inputFocusClass}`}
        />
      </LogCard>

      <LogCard>
        <LogSectionHeading hint="When were you there?">Visit date &amp; time</LogSectionHeading>
        <button
          type="button"
          onClick={openSheet}
          className="flex w-full items-center gap-3 rounded-xl bg-[color:var(--color-surface-alt)] px-4 py-3.5 text-left text-sm text-[color:var(--color-text-primary)] transition hover:brightness-[0.97] dark:hover:brightness-110"
        >
          <span className="text-base leading-none" aria-hidden>
            🕐
          </span>
          <span className="flex-1 font-medium">{formatTriggerLabel(visitedAt)}</span>
          <span className="text-[color:var(--color-text-tertiary)]" aria-hidden>
            ›
          </span>
        </button>
        <div className="mt-4 flex flex-col gap-2 border-t border-[color:var(--color-border)] pt-4">
          <LocationPermissionBanner
            message={weatherLocationBanner}
            onDismiss={() => setWeatherLocationBanner(null)}
          />
          {!isToday(visitedAt) ? (
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              No weather data available for past visits
            </p>
          ) : weather ? (
            <div className="inline-flex max-w-full flex-wrap items-center gap-2 self-start rounded-xl bg-[color:var(--color-teal-bg)] px-3 py-2 text-xs font-medium text-[color:var(--color-teal)] ring-1 ring-[color:color-mix(in_srgb,var(--color-teal)_35%,var(--color-border))]">
              <span className="text-sm leading-none" aria-hidden>
                ✓
              </span>
              <span>{weather.emoji}</span>
              <span className="text-[color:var(--color-text-primary)]">
                {Math.round(weather.temperature)}°C · Feels like{" "}
                {Math.round(weather.apparentTemperature)}°C · {weather.label}
                {weather.uvIndex != null && weather.uvIndex >= 3
                  ? ` · UV ${Math.round(weather.uvIndex)}`
                  : ""}
              </span>
            </div>
          ) : weatherLoading ? (
            <div className="inline-flex items-center gap-2 self-start rounded-xl bg-[color:var(--color-surface-alt)] px-3 py-2 text-xs font-medium text-[color:var(--color-text-secondary)] ring-1 ring-[color:var(--color-border)]">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[color:var(--color-border)] border-t-[color:var(--color-teal)]" />
              <span>Fetching weather…</span>
            </div>
          ) : weatherUnsupported ? (
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              Location not supported on this browser
            </p>
          ) : weatherUnavailable ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-[color:var(--color-text-secondary)]">Weather unavailable</p>
              <button
                type="button"
                onClick={handleCaptureWeather}
                className="text-xs font-medium text-[color:var(--color-teal)] underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCaptureWeather}
              className="inline-flex items-center justify-center self-start rounded-full bg-[color:var(--color-teal-bg)] px-4 py-2 text-sm font-medium text-[color:var(--color-teal)] ring-1 ring-[color:color-mix(in_srgb,var(--color-teal)_35%,var(--color-border))] transition hover:brightness-95 dark:hover:brightness-110"
            >
              Tap to capture weather <span aria-hidden>{"\u00a0"}🌤️</span>
            </button>
          )}
        </div>
      </LogCard>

      <LogCard>
        <div className="mb-5 flex flex-col gap-3 border-b border-[color:var(--color-border)] pb-5">
          <label
            htmlFor="photo"
            className="text-sm font-semibold text-[color:var(--color-text-primary)]"
          >
            Photo
          </label>
          <label
            htmlFor="photo"
            className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] transition hover:brightness-[0.98] dark:hover:brightness-110"
          >
            <span className="min-w-0 truncate">
              {photoFile ? photoFile.name : "Add a sunny scoop photo"}
            </span>
            <span className="shrink-0 rounded-full bg-[color:var(--color-teal)] px-3 py-1 text-xs font-semibold text-[color:var(--color-on-brand)]">
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
                if (!file) setPhotoVisibility("public");
              }}
            />
          </label>
          {photoFile ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[color:var(--color-text-secondary)]">
                Who can see this photo?
              </span>
              <PhotoVisibilityPicker value={photoVisibility} onChange={setPhotoVisibility} />
              <p className="text-xs text-[color:var(--color-text-tertiary)]">
                Followers are people who follow you on Gellog.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="price-paid"
            className="text-sm font-semibold text-[color:var(--color-text-primary)]"
          >
            Price paid (optional)
          </label>
          <div
            className={`flex items-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] focus-within:border-[color:var(--color-teal)] focus-within:ring-2 focus-within:ring-[color:var(--color-teal)]`}
          >
            <span className="pl-3 text-sm text-[color:var(--color-text-tertiary)]">€</span>
            <input
              id="price-paid"
              type="text"
              inputMode="decimal"
              value={pricePaid}
              onChange={(e) => {
                setPricePaid(e.target.value);
                setPriceWarning(null);
              }}
              onBlur={() => {
                const val = parseFloat(pricePaid.replace(",", "."));
                if (!isNaN(val) && val >= 20) setPriceWarning(val >= 100 ? val / 100 : val / 10);
              }}
              placeholder="0.00"
              className="w-full rounded-xl bg-transparent px-2 py-2.5 text-sm text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-tertiary)] focus:outline-none"
            />
          </div>
          <label className="mt-1 flex cursor-pointer items-start gap-2 text-xs text-[color:var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={hidePriceFromOthers}
              onChange={(e) => setHidePriceFromOthers(e.target.checked)}
              className="mt-0.5 rounded border-[color:var(--color-border)] text-[color:var(--color-teal)] focus:ring-[color:var(--color-teal)]"
            />
            <span>Hide this price from other people (only you will see it)</span>
          </label>
          {priceWarning != null ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-sm italic text-[color:var(--color-text-secondary)]">
                That seems high — did you mean €{priceWarning.toFixed(2)}? Gelato usually costs a few euros.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPricePaid(priceWarning.toFixed(2));
                    setPriceWarning(null);
                  }}
                  className="rounded-full bg-[color:var(--color-surface-alt)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-text-primary)] ring-1 ring-[color:var(--color-border)] transition hover:brightness-95 dark:hover:brightness-110"
                >
                  Yes, use €{priceWarning.toFixed(2)}
                </button>
                <button
                  type="button"
                  onClick={() => setPriceWarning(null)}
                  className="rounded-full bg-[color:var(--color-surface-alt)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-text-primary)] ring-1 ring-[color:var(--color-border)] transition hover:brightness-95 dark:hover:brightness-110"
                >
                  No, keep €{pricePaid}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </LogCard>

      <LogCard className="p-4">
        <label className="mb-3 block text-sm font-semibold text-[color:var(--color-text-primary)]">
          Visibility
        </label>
        <VisibilityPicker value={visibility} onChange={setVisibility} />
      </LogCard>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--color-orange)] px-6 text-sm font-semibold text-[color:var(--color-on-brand)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal)] focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface-alt)] disabled:opacity-60"
      >
        {submitting ? "Scooping…" : "Save Log"}
      </button>
    </form>
  );
}

