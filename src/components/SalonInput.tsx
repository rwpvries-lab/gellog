"use client";

import { createClient } from "@/src/lib/supabase/client";
import { ICE_CREAM_AUTOCOMPLETE_DESCRIPTION_TERMS } from "@/src/lib/looksLikeIceCreamSalon";
import { useEffect, useRef, useState } from "react";

type Prediction = {
  place_id: string;
  description?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

export type SalonData = {
  salon_name: string;
  salon_place_id: string | null;
  salon_address: string | null;
  salon_lat: number | null;
  salon_lng: number | null;
  salon_city: string | null;
};

type SalonInputProps = {
  value: string;
  onPlaceSelect: (data: SalonData) => void;
  userId: string;
  onOpenMap?: () => void;
};

type DropdownItem =
  | { type: "place"; prediction: Prediction }
  | { type: "recent"; name: string };

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

export function SalonInput({ value, onPlaceSelect, userId, onOpenMap }: SalonInputProps) {
  const [items, setItems] = useState<DropdownItem[]>([]);
  const [recentSalons, setRecentSalons] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("ice_cream_logs")
      .select("salon_name")
      .eq("user_id", userId)
      .order("visited_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return;
        const seen = new Set<string>();
        const unique: string[] = [];
        for (const row of data) {
          if (row.salon_name && !seen.has(row.salon_name)) {
            seen.add(row.salon_name);
            unique.push(row.salon_name);
            if (unique.length >= 3) break;
          }
        }
        setRecentSalons(unique);
      });
  }, [userId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchPredictions(input: string) {
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
      const predictions = narrowAutocompletePredictions(raw).slice(0, 5);
      setItems(predictions.map((p) => ({ type: "place" as const, prediction: p })));
      setActiveIdx(-1);
      setOpen(true);
    } catch {
      // silently fall back — user can still type freely
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onPlaceSelect({
      salon_name: val,
      salon_place_id: null,
      salon_address: null,
      salon_lat: null,
      salon_lng: null,
      salon_city: null,
    });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length === 0) {
      if (recentSalons.length > 0) {
        setItems(recentSalons.map((name) => ({ type: "recent" as const, name })));
        setOpen(true);
      } else {
        setItems([]);
        setOpen(false);
      }
      return;
    }

    if (val.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(val);
    }, 300);
  }

  function handleFocus() {
    if (!value && recentSalons.length > 0) {
      setItems(recentSalons.map((name) => ({ type: "recent" as const, name })));
      setOpen(true);
    }
  }

  async function selectPlace(placeId: string, name: string) {
    setOpen(false);
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
        for (const component of result.address_components as { types: string[]; long_name: string }[]) {
          if (component.types.includes("locality")) {
            city = component.long_name;
            break;
          }
        }
      }
      onPlaceSelect({ salon_name: name, salon_place_id: placeId, salon_address: address, salon_lat: lat, salon_lng: lng, salon_city: city });
    } catch {
      onPlaceSelect({ salon_name: name, salon_place_id: placeId, salon_address: null, salon_lat: null, salon_lng: null, salon_city: null });
    }
  }

  function selectRecent(name: string) {
    onPlaceSelect({ salon_name: name, salon_place_id: null, salon_address: null, salon_lat: null, salon_lng: null, salon_city: null });
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const item = items[activeIdx];
      if (item.type === "place") {
        selectPlace(item.prediction.place_id, predictionMainText(item.prediction));
      } else {
        selectRecent(item.name);
      }
    }
  }

  const showRecentHeader = items.length > 0 && items[0].type === "recent";

  return (
    <div ref={containerRef} className="relative">
      <input
        id="salon-name"
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="e.g. Gelateria Roma"
        autoComplete="off"
        className={`w-full rounded-2xl border border-orange-100 bg-white/80 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100${onOpenMap ? " pr-10" : ""}`}
      />
      {onOpenMap && (
        <button
          type="button"
          onClick={onOpenMap}
          title="Find nearby salons on map"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-xl text-base transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          🗺
        </button>
      )}
      {open && items.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
          {showRecentHeader && (
            <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Recent visits
            </div>
          )}
          {items.map((item, i) => {
            const isActive = i === activeIdx;
            if (item.type === "recent") {
              return (
                <button
                  key={`recent-${item.name}`}
                  type="button"
                  onMouseDown={() => selectRecent(item.name)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                    isActive ? "bg-teal-50" : "hover:bg-teal-50"
                  }`}
                >
                  <span className="text-zinc-400">🕐</span>
                  <span className="font-medium text-zinc-900">{item.name}</span>
                </button>
              );
            }
            const main = predictionMainText(item.prediction);
            const secondary = predictionSecondaryText(item.prediction);
            return (
              <button
                key={item.prediction.place_id}
                type="button"
                onMouseDown={() =>
                  selectPlace(item.prediction.place_id, main)
                }
                className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition ${
                  isActive ? "bg-teal-50" : "hover:bg-teal-50"
                }`}
              >
                <span className="flex items-center gap-1.5 font-semibold text-zinc-900">
                  <span>🍦</span>
                  {main}
                </span>
                <span className="text-xs text-zinc-400">{secondary}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
