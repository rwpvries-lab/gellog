"use client";

import { useEffect, useRef, useState } from "react";
import type { SalonData } from "./SalonInput";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google: any;
  }
}

const AMSTERDAM = { lat: 52.37, lng: 4.89 };

type InfoCard = {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  lat: number;
  lng: number;
};

function makePinUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <path fill="#0d9488" d="M18 0C8.06 0 0 8.06 0 18c0 13.97 18 26 18 26S36 31.97 36 18 27.94 0 18 0z"/>
    <text x="18" y="25" text-anchor="middle" font-size="18" font-family="Arial,sans-serif">🍦</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function SalonMapPicker({
  onSelect,
  onClose,
}: {
  onSelect: (data: SalonData) => void;
  onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [infoCard, setInfoCard] = useState<InfoCard | null>(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;

    function initMap(center: { lat: number; lng: number }) {
      if (!mapRef.current || !window.google?.maps) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });

      const service = new window.google.maps.places.PlacesService(map);
      service.nearbySearch(
        {
          location: center,
          radius: 2000,
          type: "food",
          keyword: "gelato|ijssalon|ice cream",
        },
        (results: any[], status: string) => {
          setMapLoading(false);
          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !results
          )
            return;

          const pinUrl = makePinUrl();

          results.forEach((place: any) => {
            if (!place.geometry?.location) return;
            const marker = new window.google.maps.Marker({
              map,
              position: place.geometry.location,
              icon: {
                url: pinUrl,
                scaledSize: new window.google.maps.Size(36, 44),
                anchor: new window.google.maps.Point(18, 44),
              },
              title: place.name,
            });

            marker.addListener("click", () => {
              setInfoCard({
                place_id: place.place_id,
                name: place.name,
                address: place.vicinity ?? "",
                rating: place.rating,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              });
            });
          });
        }
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
        () => initMap(AMSTERDAM)
      );
    }

    if (window.google?.maps) {
      getUserLocationAndInit();
      return;
    }

    // If script tag already injected but not yet ready, poll for it
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );
    if (existingScript) {
      const interval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(interval);
          getUserLocationAndInit();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = getUserLocationAndInit;
    document.head.appendChild(script);
  }, []);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:mx-4 sm:max-w-lg sm:rounded-3xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
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
        <div className="relative">
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
                  ⭐ {infoCard.rating.toFixed(1)}
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
          </div>
        ) : (
          <div className="px-4 py-3 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {mapLoading
              ? "Finding nearby salons…"
              : "Tap a 🍦 pin to select a salon"}
          </div>
        )}
      </div>
    </div>
  );
}
