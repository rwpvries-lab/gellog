"use client";

import { shouldShowIceCreamMapMarker } from "@/src/lib/looksLikeIceCreamSalon";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SalonData } from "./SalonInput";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google: any;
  }
}

const AMSTERDAM = { lat: 52.37, lng: 4.89 };

/** Text Search query (Places JS textSearch). */
const MAP_ICE_TEXT_QUERY = "ijssalon gelato ice cream";

/** Salons already present in Gellog (aggregated for map + sheet). */
export type MapLoggedSalon = {
  place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number;
  visit_count: number;
};

/** Pin / sheet semantics: `isUnlogged` means Google place not in Gellog `salons` prop. */
export type SalonPin = {
  place_id: string;
  isUnlogged?: boolean;
};

type InfoCard = {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  visitCount?: number;
  lat: number;
  lng: number;
  isUnlogged: boolean;
};

function makePinUrl(fillColor: string, width: number): string {
  const height = Math.round((width * 44) / 36);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 36 44">
    <path fill="${fillColor}" d="M18 0C8.06 0 0 8.06 0 18c0 13.97 18 26 18 26S36 31.97 36 18 27.94 0 18 0z"/>
    <text x="18" y="25" text-anchor="middle" font-size="18" font-family="Arial,sans-serif">🍦</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function SalonMapPicker({
  salons,
  onSelect,
  onClose,
}: {
  salons: MapLoggedSalon[];
  onSelect: (data: SalonData) => void;
  onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const placedIdsRef = useRef<Set<string>>(new Set());
  const salonsRef = useRef(salons);
  salonsRef.current = salons;
  const idleListenerRef = useRef<{ remove: () => void } | null>(null);

  const [mapLoading, setMapLoading] = useState(true);
  const [infoCard, setInfoCard] = useState<InfoCard | null>(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;

    function initMap(center: { lat: number; lng: number }) {
      if (!mapRef.current || !window.google?.maps) return;

      placedIdsRef.current = new Set();

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });

      const service = new window.google.maps.places.PlacesService(map);
      const PlacesStatus = window.google.maps.places.PlacesServiceStatus;

      function handleResults(results: any[] | null, status: string) {
        if (status !== PlacesStatus.OK && status !== PlacesStatus.ZERO_RESULTS) {
          return;
        }

        const loggedIds = new Set(salonsRef.current.map((s) => s.place_id));

        for (const place of results ?? []) {
          if (!place.place_id) continue;
          if (placedIdsRef.current.has(place.place_id)) continue;
          if (!shouldShowIceCreamMapMarker(place)) continue;
          if (!place.geometry?.location) continue;

          const isUnlogged = !loggedIds.has(place.place_id);
          const pinColor = isUnlogged ? "#9CA3AF" : "#0d9488";
          const pinSize = isUnlogged ? 26 : 36;
          const pinUrl = makePinUrl(pinColor, pinSize);
          const h = Math.round((pinSize * 44) / 36);

          const matchingLogged = salonsRef.current.find(
            (s) => s.place_id === place.place_id,
          );

          const marker = new window.google.maps.Marker({
            map,
            position: place.geometry.location,
            icon: {
              url: pinUrl,
              scaledSize: new window.google.maps.Size(pinSize, h),
              anchor: new window.google.maps.Point(pinSize / 2, h),
            },
            title: place.name,
          });

          const address =
            place.vicinity ?? place.formatted_address?.split(",")[0] ?? "";

          marker.addListener("click", () => {
            setInfoCard({
              place_id: place.place_id!,
              name: place.name ?? "Salon",
              address,
              rating: matchingLogged?.rating,
              visitCount: matchingLogged?.visit_count,
              lat: place.geometry!.location!.lat(),
              lng: place.geometry!.location!.lng(),
              isUnlogged,
            });
          });

          placedIdsRef.current.add(place.place_id);
        }
      }

      // Place logged salons first (Gellog DB), before any Places search
      const tealUrl = makePinUrl("#0d9488", 36);
      for (const s of salonsRef.current) {
        if (placedIdsRef.current.has(s.place_id)) continue;
        const pos = new window.google.maps.LatLng(s.lat, s.lng);
        const marker = new window.google.maps.Marker({
          map,
          position: pos,
          icon: {
            url: tealUrl,
            scaledSize: new window.google.maps.Size(36, 44),
            anchor: new window.google.maps.Point(18, 44),
          },
          title: s.name,
        });

        marker.addListener("click", () => {
          setInfoCard({
            place_id: s.place_id,
            name: s.name,
            address: s.address ?? "",
            rating: s.rating,
            visitCount: s.visit_count,
            lat: s.lat,
            lng: s.lng,
            isUnlogged: false,
          });
        });

        placedIdsRef.current.add(s.place_id);
      }

      service.textSearch(
        {
          query: MAP_ICE_TEXT_QUERY,
          location: map.getCenter(),
          radius: 3000,
        },
        (results: any[] | null, status: string) => {
          setMapLoading(false);
          handleResults(results, status);

          if (idleListenerRef.current) {
            window.google.maps.event.removeListener(idleListenerRef.current);
            idleListenerRef.current = null;
          }

          idleListenerRef.current = map.addListener("idle", () => {
            const bounds = map.getBounds();
            if (!bounds) return;
            service.textSearch(
              {
                query: MAP_ICE_TEXT_QUERY,
                bounds,
              },
              handleResults,
            );
          });
        },
      );
    }

    function getUserLocationAndInit() {
      if (!navigator.geolocation) {
        initMap(AMSTERDAM);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          initMap({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => initMap(AMSTERDAM),
      );
    }

    if (window.google?.maps) {
      getUserLocationAndInit();
    } else {
      const existingScript = document.querySelector(
        `script[src*="maps.googleapis.com/maps/api/js"]`,
      );
      if (existingScript) {
        const interval = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(interval);
            getUserLocationAndInit();
          }
        }, 100);
        return () => {
          clearInterval(interval);
          if (idleListenerRef.current && window.google?.maps?.event) {
            window.google.maps.event.removeListener(idleListenerRef.current);
            idleListenerRef.current = null;
          }
        };
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.onload = getUserLocationAndInit;
      document.head.appendChild(script);
    }

    return () => {
      if (idleListenerRef.current && window.google?.maps?.event) {
        window.google.maps.event.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }
    };
  }, [salons]);

  async function handleSelect() {
    if (!infoCard) return;
    setSelecting(true);
    try {
      const url = new URL("/api/places/details", window.location.origin);
      url.searchParams.set("place_id", infoCard.place_id);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("details failed");
      const data = await response.json();
      const result = data.result;
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
      onSelect({
        salon_name: infoCard.name,
        salon_place_id: infoCard.place_id,
        salon_address: result?.formatted_address ?? infoCard.address,
        salon_lat: result?.geometry?.location?.lat ?? infoCard.lat,
        salon_lng: result?.geometry?.location?.lng ?? infoCard.lng,
        salon_city: city,
      });
    } catch {
      onSelect({
        salon_name: infoCard.name,
        salon_place_id: infoCard.place_id,
        salon_address: infoCard.address,
        salon_lat: infoCard.lat,
        salon_lng: infoCard.lng,
        salon_city: null,
      });
    } finally {
      setSelecting(false);
      onClose();
    }
  }

  function directionsHref(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full max-h-[90vh] flex-col overflow-hidden overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:mx-4 sm:max-w-lg sm:rounded-3xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Nearby salons
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          >
            ✕
          </button>
        </div>

        {/* Map */}
        <div className="relative shrink-0">
          <div
            ref={mapRef}
            className="h-72 w-full bg-zinc-100 dark:bg-zinc-800"
          />
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
            </div>
          )}
        </div>

        {/* Info card / hint */}
        {infoCard ? (
          <div className="flex flex-col gap-3 p-4">
            {infoCard.isUnlogged ? (
              <>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {infoCard.name}
                  </p>
                  {infoCard.address && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {infoCard.address}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-teal-500/15 px-4 py-3 text-center text-sm font-medium text-teal-800 dark:bg-teal-500/20 dark:text-teal-200">
                  No logs here yet...
                </div>
                <button
                  type="button"
                  onClick={handleSelect}
                  disabled={selecting}
                  className="w-full rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
                >
                  {selecting ? "Selecting…" : "Select this salon"}
                </button>
                <a
                  href={directionsHref(infoCard.lat, infoCard.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Get directions
                </a>
              </>
            ) : (
              <>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {infoCard.name}
                  </p>
                  {infoCard.address && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {infoCard.address}
                    </p>
                  )}
                  {infoCard.rating != null && (
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      ⭐ {infoCard.rating.toFixed(1)} avg
                    </p>
                  )}
                  {infoCard.visitCount != null && infoCard.visitCount > 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {infoCard.visitCount} visit
                      {infoCard.visitCount === 1 ? "" : "s"} on Gellog
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSelect}
                  disabled={selecting}
                  className="w-full rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
                >
                  {selecting ? "Selecting…" : "Select this salon"}
                </button>
                <Link
                  href={`/salon/${encodeURIComponent(infoCard.place_id)}`}
                  className="block w-full rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-center text-sm font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-950/60"
                >
                  View salon page
                </Link>
                <a
                  href={directionsHref(infoCard.lat, infoCard.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Get directions
                </a>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {mapLoading
              ? "Finding nearby salons…"
              : "Tap a 🍦 pin for details"}
          </div>
        )}
      </div>
    </div>
  );
}
