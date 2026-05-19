"use client";

import type { SalonData } from "@/src/components/SalonInput";
import { ICE_CREAM_AUTOCOMPLETE_DESCRIPTION_TERMS } from "@/src/lib/looksLikeIceCreamSalon";
import { ChevronDown, ChevronRight, MapPin, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { LogFlowAction, LogFlowState } from "../logFlowReducer";
import { buildVisitedAt, pad } from "../newLogShared";

type Prediction = {
  place_id: string;
  description?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

function predictionMainText(p: Prediction): string {
  return (
    p.structured_formatting?.main_text?.trim() ||
    p.description?.split(",")[0]?.trim() ||
    "Salon"
  );
}

function predictionSecondaryText(p: Prediction): string {
  return p.structured_formatting?.secondary_text?.trim() ?? "";
}

function narrowAutocompletePredictions(raw: Prediction[]): Prediction[] {
  const filtered = raw.filter((r) => {
    const desc = (r.description ?? "").toLowerCase();
    return ICE_CREAM_AUTOCOMPLETE_DESCRIPTION_TERMS.some((term) =>
      desc.includes(term),
    );
  });
  return filtered.length > 0 ? filtered : raw;
}

function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function last7Days(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return out;
}

const DAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function Step1_SalonDate({
  state,
  dispatch,
  userId: _userId,
}: {
  state: LogFlowState;
  dispatch: React.Dispatch<LogFlowAction>;
  userId: string;
}) {
  void _userId;
  const [focused, setFocused] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [timeOpen, setTimeOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocationRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    const url = new URL("/api/places/autocomplete", window.location.origin);
    url.searchParams.set("input", input);
    const loc = userLocationRef.current;
    if (loc) {
      url.searchParams.set("locationBias", `circle:50000@${loc.lat},${loc.lng}`);
    }
    try {
      const response = await fetch(url.toString());
      if (!response.ok) return;
      const data = await response.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return;
      const raw: Prediction[] = data.predictions ?? [];
      const narrowed = narrowAutocompletePredictions(raw).slice(0, 3);
      setPredictions(narrowed);
    } catch {
      setPredictions([]);
    }
  }, []);

  const applySalonData = useCallback(
    (data: SalonData) => {
      dispatch({ type: "SET_SALON", salon: data });
    },
    [dispatch],
  );

  const fetchPlaceDetails = useCallback(
    async (placeId: string, mainName: string): Promise<SalonData> => {
      try {
        const url = new URL("/api/places/details", window.location.origin);
        url.searchParams.set("place_id", placeId);
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("details failed");
        const data = await response.json();
        const result = data.result;
        const lat: number | null = result?.geometry?.location?.lat ?? null;
        const lng: number | null = result?.geometry?.location?.lng ?? null;
        const address: string | null = result?.formatted_address ?? null;
        let city: string | null = null;
        if (result?.address_components) {
          for (const component of result.address_components as {
            types: string[];
            long_name: string;
          }[]) {
            if (component.types.includes("locality")) {
              city = component.long_name;
              break;
            }
          }
        }
        return {
          salon_name: mainName,
          salon_place_id: placeId,
          salon_address: address,
          salon_lat: lat,
          salon_lng: lng,
          salon_city: city,
        };
      } catch {
        return {
          salon_name: mainName,
          salon_place_id: placeId,
          salon_address: null,
          salon_lat: null,
          salon_lng: null,
          salon_city: null,
        };
      }
    },
    [],
  );

  useLayoutEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [state.step1.date]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    applySalonData({
      salon_name: val,
      salon_place_id: null,
      salon_address: null,
      salon_lat: null,
      salon_lng: null,
      salon_city: null,
    });
    setPredictions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchPredictions(val);
    }, 300);
  }

  async function handlePickPrediction(p: Prediction) {
    const data = await fetchPlaceDetails(p.place_id, predictionMainText(p));
    applySalonData(data);
    setPredictions([]);
  }

  const visitedLabel = formatLongDate(state.step1.date);
  const timeLabel = `${pad(state.step1.hour)}:${pad(state.step1.minute)}`;

  const chips = last7Days();

  return (
    <div className="flex flex-col gap-8">
      <div
        className={`flex h-[52px] w-full items-center gap-3 rounded-full border bg-[color:var(--background-secondary)] px-4 transition-colors ${
          focused ? "border-[color:var(--border-focus)]" : "border-[color:var(--border-strong)]"
        }`}
      >
        <Search className="h-5 w-5 shrink-0 text-[color:var(--brand-primary)]" strokeWidth={2} aria-hidden />
        <input
          type="search"
          value={state.step1.salonInput}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="e.g. Gelateria Roma"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent font-sans text-base text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none"
        />
      </div>

      {predictions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {predictions.map((p) => {
            const selected = state.step1.salon?.salon_place_id === p.place_id;
            const main = predictionMainText(p);
            const secondary = predictionSecondaryText(p);
            return (
              <button
                key={p.place_id}
                type="button"
                onClick={() => void handlePickPrediction(p)}
                className={`flex h-16 w-full shrink-0 items-center gap-3 rounded-2xl border px-3 text-left transition-colors ${
                  selected
                    ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary-surface)]"
                    : "border-[color:var(--border-default)] bg-[color:var(--background-secondary)]"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    selected ? "bg-[color:var(--brand-primary)] text-[color:var(--text-inverse)]" : "text-[color:var(--brand-primary)]"
                  }`}
                  style={!selected ? { background: 'color-mix(in srgb, var(--brand-primary-muted) 40%, transparent)' } : undefined}
                >
                  <MapPin className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[18px] font-medium text-[color:var(--text-primary)]">
                    {main}
                  </p>
                  {secondary ? (
                    <p className="truncate font-sans text-[13px] text-[color:var(--text-secondary)]">{secondary}</p>
                  ) : null}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--brand-primary)]" aria-hidden />
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
          Date &amp; time of visit
        </p>
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 font-serif text-2xl font-medium leading-tight text-[color:var(--text-primary)]">
            {visitedLabel}
          </p>
          <button
            type="button"
            onClick={() => setTimeOpen(true)}
            className="inline-flex shrink-0 items-center gap-1 font-serif text-2xl font-medium text-[color:var(--brand-primary)]"
          >
            {timeLabel}
            <ChevronDown className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="relative">
          <div
            ref={chipsRef}
            className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              maskImage: "linear-gradient(to right, transparent 0%, black 28px)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 28px)",
            }}
          >
            {chips.map((dateStr) => {
              const [y, m, d] = dateStr.split("-").map(Number);
              const dt = new Date(y, m - 1, d);
              const dow = DAY_SHORT[dt.getDay()];
              const selected = state.step1.date === dateStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => dispatch({ type: "SET_DATE", date: dateStr })}
                  className={`flex h-16 w-[52px] shrink-0 flex-col items-center justify-center rounded-2xl border font-sans transition-colors ${
                    selected
                      ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-[color:var(--text-inverse)]"
                      : "border-[color:var(--border-default)] bg-[color:var(--background-secondary)] text-[color:var(--text-primary)]"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">{dow}</span>
                  <span className="text-lg font-semibold leading-none">{dt.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {timeOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-[color:var(--color-backdrop)]"
            aria-label="Close"
            onClick={() => setTimeOpen(false)}
          />
          <div className="relative rounded-t-2xl border border-[color:var(--border-default)] bg-[color:var(--background-secondary)] px-5 pb-8 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTimeOpen(false)}
                className="font-sans text-sm text-[color:var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setTimeOpen(false)}
                className="font-sans text-sm font-medium text-[color:var(--brand-primary)]"
              >
                Done
              </button>
            </div>
            <label className="flex flex-col gap-2">
              <span className="font-sans text-xs uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Time
              </span>
              <input
                type="time"
                step={900}
                value={`${pad(state.step1.hour)}:${pad(state.step1.minute)}`}
                onChange={(e) => {
                  const [hh, mm] = e.target.value.split(":").map(Number);
                  dispatch({ type: "SET_TIME", hour: hh ?? 0, minute: mm ?? 0 });
                }}
                className="h-12 w-full rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--background-primary)] px-3 font-sans text-lg text-[color:var(--text-primary)] focus:border-[color:var(--border-focus)] focus:outline-none"
              />
            </label>
          </div>
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {buildVisitedAt(state.step1.date, state.step1.hour, state.step1.minute)}
      </span>
    </div>
  );
}
