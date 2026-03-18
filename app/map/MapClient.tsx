"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SalonPin } from "./page";

declare global { interface Window { google: any; } }

const AMSTERDAM = { lat: 52.3676, lng: 4.9041 };

function makePinSvg(size: number, highlighted = false): string {
  const color = highlighted ? "#f97316" : "#0d9488";
  const h = Math.round(size * 1.22);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 36 44">
    <path fill="${color}" d="M18 0C8.06 0 0 8.06 0 18c0 13.97 18 26 18 26S36 31.97 36 18 27.94 0 18 0z"/>
    <text x="18" y="25" text-anchor="middle" font-size="18" font-family="Arial,sans-serif">🍦</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function MapClient({ salons }: { salons: SalonPin[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const pinSizesRef = useRef<Map<string, number>>(new Map());
  const dragStartY = useRef<number | null>(null);
  const markerJustTapped = useRef(false);

  const [selected, setSelected] = useState<SalonPin | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // One-time toast
  useEffect(() => {
    if (!sessionStorage.getItem("map-toast-shown")) {
      setShowToast(true);
      sessionStorage.setItem("map-toast-shown", "1");
      setTimeout(() => setShowToast(false), 2000);
    }
  }, []);

  // Update pin icons when selection changes
  useEffect(() => {
    if (!window.google?.maps) return;
    for (const [place_id, marker] of markersRef.current) {
      const base = pinSizesRef.current.get(place_id) ?? 36;
      const isSelected = selected?.place_id === place_id;
      const size = isSelected ? Math.round(base * 1.3) : base;
      const h = Math.round(size * 1.22);
      marker.setIcon({
        url: makePinSvg(size, isSelected),
        scaledSize: new window.google.maps.Size(size, h),
        anchor: new window.google.maps.Point(size / 2, h),
      });
      marker.setZIndex(isSelected ? 100 : 1);
    }
  }, [selected]);

  // Init map
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;

    function initMap(center: { lat: number; lng: number }) {
      if (!mapRef.current || !window.google?.maps) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
      });

      const counts = salons.map((s) => s.visit_count);
      const minCount = counts.length ? Math.min(...counts) : 1;
      const maxCount = counts.length ? Math.max(...counts) : 1;

      for (const salon of salons) {
        const t = maxCount > minCount
          ? (salon.visit_count - minCount) / (maxCount - minCount)
          : 0;
        const pinSize = Math.round(32 + t * 16);
        const pinH = Math.round(pinSize * 1.22);
        pinSizesRef.current.set(salon.place_id, pinSize);

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

        markersRef.current.set(salon.place_id, marker);

        marker.addListener("click", () => {
          markerJustTapped.current = true;
          setTimeout(() => { markerJustTapped.current = false; }, 300);
          setShowDirections(false);
          setExpanded(false);
          setSelected(salon);
        });
      }

      map.addListener("click", () => {
        if (markerJustTapped.current) return;
        setSelected(null);
        setExpanded(false);
        setShowDirections(false);
      });

      setMapReady(true);
    }

    function getUserLocationAndInit() {
      if (!navigator.geolocation) { initMap(AMSTERDAM); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => initMap({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => initMap(AMSTERDAM),
      );
    }

    if (window.google?.maps) { getUserLocationAndInit(); return; }

    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );
    if (existingScript) {
      const interval = setInterval(() => {
        if (window.google?.maps) { clearInterval(interval); getUserLocationAndInit(); }
      }, 100);
      return () => clearInterval(interval);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = getUserLocationAndInit;
    document.head.appendChild(script);
  }, [salons]);

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - e.changedTouches[0].clientY;
    dragStartY.current = null;
    if (delta > 40) {
      setExpanded(true);
    } else if (delta < -40) {
      if (expanded) { setExpanded(false); setShowDirections(false); }
      else { setSelected(null); }
    }
  }

  const googleUrl = selected
    ? `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}&destination_place_id=${selected.place_id}`
    : "";
  const appleUrl = selected
    ? `maps://maps.apple.com/?daddr=${selected.lat},${selected.lng}`
    : "";

  // How tall the bottom nav is (matches your pb-20 / h-20 nav)
  const NAV_HEIGHT = 80;

  return (
    // FIX: use a portal-like pattern by rendering into document.body via a
    // wrapper that sits outside the clipping overflow-hidden ancestor.
    // The simplest fix without a portal library: make THIS root div
    // position:fixed covering the full viewport, so it is never clipped.
    <div className="fixed inset-0" style={{ zIndex: 10 }}>
      {/* Map canvas */}
      <div ref={mapRef} className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900" />

      {/* Loading spinner */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        </div>
      )}

      {/* One-finger toast */}
      {showToast && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center" style={{ zIndex: 50 }}>
          <div className="rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
            Use one finger to move the map
          </div>
        </div>
      )}

      {/* Bottom sheet — absolutely positioned so it is never clipped */}
      {selected && (
        <div
          className="absolute inset-x-0 rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900"
          // Sit just above the nav bar
          style={{ bottom: NAV_HEIGHT, zIndex: 40 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Collapsed header — always visible */}
          <button
            type="button"
            className="w-full px-5 pb-3 pt-4 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {selected.name}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  ★ {selected.avg_rating.toFixed(1)} · {selected.visit_count}{" "}
                  {selected.visit_count === 1 ? "visit" : "visits"}
                </p>
              </div>
              <span
                className={`flex-shrink-0 text-lg text-zinc-400 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </div>
          </button>

          {/* Expanded body */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expanded ? "max-h-[60vh]" : "max-h-0"
            }`}
          >
            <div className="overflow-y-auto px-5 pb-6">
              {selected.top_flavours.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selected.top_flavours.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <Link
                  href={`/salon/${selected.place_id}`}
                  className="flex-1 rounded-2xl bg-teal-500 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  View salon page →
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDirections((v) => !v)}
                  className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700"
                >
                  Get directions
                </button>
              </div>
              {showDirections && (
                <div className="mt-3 flex flex-col gap-2">
                  <a
                    href={appleUrl}
                    className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100"
                  >
                    🗺️ Open in Apple Maps
                  </a>
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100"
                  >
                    🌐 Open in Google Maps
                  </a>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setExpanded(false);
                  setShowDirections(false);
                }}
                className="mt-4 w-full rounded-2xl py-2 text-sm text-zinc-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}