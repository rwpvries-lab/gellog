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

  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormName, setAddFormName] = useState("");
  const [addFormAddress, setAddFormAddress] = useState("");
  const [addFormCity, setAddFormCity] = useState("");
  const [addFormLat, setAddFormLat] = useState<number | null>(null);
  const [addFormLng, setAddFormLng] = useState<number | null>(null);
  const [addFormSubmitting, setAddFormSubmitting] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  const [addToast, setAddToast] = useState(false);

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

  function handleOpenAddForm() {
    setOpen(false);
    setAddFormName(value);
    setAddFormAddress("");
    setAddFormCity("");
    setAddFormLat(null);
    setAddFormLng(null);
    setShowAddForm(true);
  }

  async function handleLocateMe() {
    if (!navigator.geolocation) return;
    setLocatingMe(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setAddFormLat(lat);
      setAddFormLng(lng);

      const url = new URL("/api/places/reverse-geocode", window.location.origin);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const result = data.results?.[0];
        if (result) {
          setAddFormAddress(result.formatted_address ?? "");
          const locality = result.address_components?.find((c: { types: string[] }) =>
            c.types.includes("locality"),
          );
          if (locality) setAddFormCity(locality.long_name);
        }
      }
    } catch {
      // geolocation denied or timed out — lat/lng stay null
    } finally {
      setLocatingMe(false);
    }
  }

  async function handleAddSalonSubmit() {
    if (!addFormName.trim()) return;
    setAddFormSubmitting(true);
    try {
      const supabase = createClient();
      const syntheticPlaceId = `user_sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await supabase.from("salon_profiles").insert({
        place_id: syntheticPlaceId,
        salon_name: addFormName.trim(),
        salon_address: addFormAddress.trim() || null,
        salon_city: addFormCity.trim() || null,
        salon_lat: addFormLat,
        salon_lng: addFormLng,
        is_user_submitted: true,
        submitted_by: userId,
        is_claimed: false,
      });
      onPlaceSelect({
        salon_name: addFormName.trim(),
        salon_place_id: null,
        salon_address: addFormAddress.trim() || null,
        salon_lat: null,
        salon_lng: null,
        salon_city: addFormCity.trim() || null,
      });
      setShowAddForm(false);
      setAddToast(true);
      setTimeout(() => setAddToast(false), 3500);
    } finally {
      setAddFormSubmitting(false);
    }
  }

  const showRecentHeader = items.length > 0 && items[0].type === "recent";

  const hasExactMatch = items.some((item) => {
    const name = item.type === "place" ? predictionMainText(item.prediction) : item.name;
    return name.toLowerCase() === value.toLowerCase();
  });
  const showAddRow = value.length >= 3 && !hasExactMatch;

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
          title="Choose on map"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-xl text-base transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          🗺
        </button>
      )}
      {open && (items.length > 0 || showAddRow) && (
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
          {showAddRow && (
            <button
              type="button"
              onMouseDown={handleOpenAddForm}
              className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2.5 text-left text-sm transition hover:bg-teal-50"
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-600">+</span>
              <span className="text-zinc-600">
                Add <span className="font-semibold text-zinc-900">"{value}"</span> as a new salon
              </span>
            </button>
          )}
        </div>
      )}

      {/* Add salon bottom sheet */}
      {showAddForm && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAddForm(false)}
          />
          <div className="relative flex max-h-[60vh] flex-col rounded-t-[20px] bg-white shadow-2xl dark:bg-zinc-900">
            {/* Handle */}
            <div className="flex flex-shrink-0 items-center justify-between px-5 py-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-sm text-zinc-500"
              >
                Cancel
              </button>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add a new salon</span>
              <div className="w-14" />
            </div>
            <div className="overflow-y-auto px-5 pb-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Salon name
                  </label>
                  <input
                    type="text"
                    value={addFormName}
                    onChange={(e) => setAddFormName(e.target.value)}
                    autoFocus
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Address <span className="font-normal text-zinc-400">(optional but encouraged)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={locatingMe}
                      className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-60 dark:bg-teal-900/30 dark:text-teal-300"
                    >
                      {locatingMe ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                      ) : (
                        <span>📍</span>
                      )}
                      {locatingMe ? "Locating…" : addFormLat ? "Re-locate" : "Use my location"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={addFormAddress}
                    onChange={(e) => setAddFormAddress(e.target.value)}
                    placeholder="e.g. Via Roma 12"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    City
                  </label>
                  <input
                    type="text"
                    value={addFormCity}
                    onChange={(e) => setAddFormCity(e.target.value)}
                    placeholder="e.g. Amsterdam"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  We'll review and verify this salon. It'll appear on the map after approval.
                </p>
                <button
                  type="button"
                  onClick={handleAddSalonSubmit}
                  disabled={!addFormName.trim() || addFormSubmitting}
                  className="w-full rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
                >
                  {addFormSubmitting ? "Adding…" : "Add this salon"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {addToast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center">
          <div className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            Salon added! It will appear on the map after review.
          </div>
        </div>
      )}
    </div>
  );
}
