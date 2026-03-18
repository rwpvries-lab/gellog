"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SalonPin } from "./page";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google: any;
  }
}

const AMSTERDAM = { lat: 52.3676, lng: 4.9041 };

function makePinSvg(size: number): string {
  const h = Math.round(size * 1.22);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 36 44">
    <path fill="#0d9488" d="M18 0C8.06 0 0 8.06 0 18c0 13.97 18 26 18 26S36 31.97 36 18 27.94 0 18 0z"/>
    <text x="18" y="25" text-anchor="middle" font-size="18" font-family="Arial,sans-serif">🍦</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function MapClient({ salons }: { salons: SalonPin[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SalonPin | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;

    function initMap(center: { lat: number; lng: number }) {
      if (!mapRef.current || !window.google?.maps) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
      });

      const counts = salons.map((s) => s.visit_count);
      const minCount = counts.length ? Math.min(...counts) : 1;
      const maxCount = counts.length ? Math.max(...counts) : 1;

      for (const salon of salons) {
        const t =
          maxCount > minCount
            ? (salon.visit_count - minCount) / (maxCount - minCount)
            : 0;
        const pinSize = Math.round(32 + t * 16);
        const pinH = Math.round(pinSize * 1.22);

        const marker = new window.google.maps.Marker({
          map,
          position: { lat: salon.lat, lng: salon.lng },
          icon: {
            url: makePinSvg(pinSize),
            scaledSize: new window.google.maps.Size(pinSize, pinH),
            anchor: new window.google.maps.Point(pinSize / 2, pinH),
          },
          title: salon.name,
        });

        marker.addListener("click", () => {
          setShowDirections(false);
          setSelected(salon);
        });
      }

      setMapReady(true);
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
      return;
    }

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
      return () => clearInterval(interval);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = getUserLocationAndInit;
    document.head.appendChild(script);
  }, [salons]);

  const googleUrl = selected
    ? `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}&destination_place_id=${selected.place_id}`
    : "";
  const appleUrl = selected
    ? `maps://maps.apple.com/?daddr=${selected.lat},${selected.lng}`
    : "";

  return (
    <div className="absolute inset-0">
      {/* Map */}
      <div
        ref={mapRef}
        className="h-full w-full bg-zinc-100 dark:bg-zinc-900"
      />

      {/* Loading spinner */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        </div>
      )}

      {/* Bottom sheet */}
      {selected && (
        <>
          {/* Tap outside to close */}
          <div
            className="absolute inset-0"
            onClick={() => {
              setSelected(null);
              setShowDirections(false);
            }}
          />

          <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl bg-white px-5 pb-6 pt-4 shadow-2xl dark:bg-zinc-900">
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />

            {/* Salon name */}
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {selected.name}
            </p>

            {/* Rating + visit count */}
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              ★ {selected.avg_rating.toFixed(1)} · based on{" "}
              {selected.visit_count}{" "}
              {selected.visit_count === 1 ? "visit" : "visits"}
            </p>

            {/* Top flavours */}
            {selected.top_flavours.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.top_flavours.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 flex gap-3">
              <Link
                href={`/salon/${selected.place_id}`}
                className="flex-1 rounded-2xl bg-teal-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-600"
              >
                View salon page →
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDirections((v) => !v);
                }}
                className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Get directions
              </button>
            </div>

            {/* Directions sub-options */}
            {showDirections && (
              <div className="mt-3 flex flex-col gap-2">
                <a
                  href={appleUrl}
                  className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100 transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                >
                  <span className="text-lg">🗺️</span>
                  Open in Apple Maps
                </a>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100 transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                >
                  <span className="text-lg">🌐</span>
                  Open in Google Maps
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
