"use client";

import { shouldShowIceCreamMapMarker } from "@/src/lib/looksLikeIceCreamSalon";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GellogDirections } from "@/src/components/icons";
import { LocationPermissionBanner } from "@/src/components/LocationPermissionBanner";
import {
  LOCATION_DENIED_TROUBLESHOOT_HINT,
  LOCATION_DENIED_USER_MESSAGE,
} from "@/src/lib/locationMessages";
import type { SalonPin, UserSubmittedPin } from "./page";

declare global {
  interface Window {
    google: any;
  }
}

const AMSTERDAM = { lat: 52.3676, lng: 4.9041 };
const MAP_ICE_TEXT_QUERY = "ijssalon gelato ice cream";

type MapSelection =
  | (SalonPin & { kind: "logged" })
  | {
      kind: "unlogged";
      place_id: string;
      name: string;
      lat: number;
      lng: number;
      address: string;
    };

function makePinSvg(
  size: number,
  highlighted = false,
  pinKind: "logged" | "unlogged" | "user_submitted" = "logged",
): string {
  let color: string;
  if (highlighted) color = "#f97316";
  else if (pinKind === "unlogged") color = "#9CA3AF";
  else color = "#0d9488";
  const h = Math.round(size * 1.22);
  const pathAttrs =
    pinKind === "user_submitted"
      ? `fill="white" stroke="${color}" stroke-width="2"`
      : `fill="${color}"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 36 44">
    <path ${pathAttrs} d="M18 0C8.06 0 0 8.06 0 18c0 13.97 18 26 18 26S36 31.97 36 18 27.94 0 18 0z"/>
       <text x="18" y="25" text-anchor="middle" font-size="18" font-family="Arial,sans-serif">🍦</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function MapClient({
  salons,
  userSubmittedSalons,
  pickerReturnTo = null,
}: {
  salons: SalonPin[];
  userSubmittedSalons: UserSubmittedPin[];
  /** When set (from `?returnTo=`), map is used to pick a salon for the new-log flow. */
  pickerReturnTo?: string | null;
}) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userOverlayRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const pinSizesRef = useRef<Map<string, number>>(new Map());
  const unloggedIdsRef = useRef<Set<string>>(new Set());
  /** Picker mode: user-submitted pins are in `markersRef` and use the hollow pin style. */
  const pickerUserSubmittedIdsRef = useRef<Set<string>>(new Set());
  const placedIdsRef = useRef<Set<string>>(new Set());
  const salonsRef = useRef(salons);
  salonsRef.current = salons;
  const userSubmittedSalonsRef = useRef(userSubmittedSalons);
  userSubmittedSalonsRef.current = userSubmittedSalons;
  const idleListenerRef = useRef<{ remove: () => void } | null>(null);
  const dragStartY = useRef<number | null>(null);
  const markerJustTapped = useRef(false);

  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  /** Set only after the user taps “my location” — never from automatic prompts. */
  const [locationBannerMessage, setLocationBannerMessage] = useState<string | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
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
      const pinKind = pickerUserSubmittedIdsRef.current.has(place_id)
        ? "user_submitted"
        : unloggedIdsRef.current.has(place_id)
          ? "unlogged"
          : "logged";
      marker.setIcon({
        url: makePinSvg(size, isSelected, pinKind),
        scaledSize: new window.google.maps.Size(size, h),
        anchor: new window.google.maps.Point(size / 2, h),
      });
      marker.setZIndex(isSelected ? 100 : 1);
    }
  }, [selected]);

  // Place / update the blue user-dot overlay
  useEffect(() => {
    if (!mapReady || !userLocation || !window.google?.maps) return;

    if (!document.getElementById("gellog-user-pulse-style")) {
      const style = document.createElement("style");
      style.id = "gellog-user-pulse-style";
      style.textContent = `
        @keyframes gellog-user-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.6; }
        }
      `;
      document.head.appendChild(style);
    }

    // Remove any previous overlay
    if (userOverlayRef.current) {
      userOverlayRef.current.setMap(null);
      userOverlayRef.current = null;
    }

    const pos = userLocation;

    class UserDot extends (window.google.maps.OverlayView as any) {
      private _div: HTMLDivElement | null = null;

      onAdd() {
        this._div = document.createElement("div");
        Object.assign(this._div.style, {
          position: "absolute",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "var(--color-location)",
          border: "2px solid white",
          boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-location) 25%, transparent)",
          animation: "gellog-user-pulse 1.5s ease-in-out infinite",
          pointerEvents: "none",
        });
        this.getPanes()?.overlayMouseTarget.appendChild(this._div);
      }

      draw() {
        if (!this._div) return;
        const point = this.getProjection()?.fromLatLngToDivPixel(
          new window.google.maps.LatLng(pos.lat, pos.lng),
        );
        if (!point) return;
        this._div.style.left = `${point.x}px`;
        this._div.style.top = `${point.y}px`;
      }

      onRemove() {
        this._div?.parentNode?.removeChild(this._div);
        this._div = null;
      }
    }

    const overlay = new UserDot();
    overlay.setMap(mapInstanceRef.current);
    userOverlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      userOverlayRef.current = null;
    };
  }, [mapReady, userLocation]);

  // Init map + Places (grey pins for salons not yet on Gellog)
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;

    function cleanupIdle() {
      if (idleListenerRef.current && window.google?.maps?.event) {
        window.google.maps.event.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }
    }

    function clearMarkers() {
      for (const m of markersRef.current.values()) {
        m.setMap(null);
      }
      markersRef.current.clear();
      pinSizesRef.current.clear();
      unloggedIdsRef.current.clear();
      pickerUserSubmittedIdsRef.current.clear();
      placedIdsRef.current.clear();
    }

    function initMap(center: { lat: number; lng: number }) {
      if (!mapRef.current || !window.google?.maps) return;

      cleanupIdle();
      clearMarkers();

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
      });

      mapInstanceRef.current = map;

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
          if (loggedIds.has(place.place_id)) continue;
          if (!shouldShowIceCreamMapMarker(place)) continue;
          if (!place.geometry?.location) continue;

          const pinSize = 26;
          const pinH = Math.round(pinSize * 1.22);
          pinSizesRef.current.set(place.place_id, pinSize);
          unloggedIdsRef.current.add(place.place_id);

          const marker = new window.google.maps.Marker({
            map,
            position: place.geometry.location,
            icon: {
              url: makePinSvg(pinSize, false, "unlogged"),
              scaledSize: new window.google.maps.Size(pinSize, pinH),
              anchor: new window.google.maps.Point(pinSize / 2, pinH),
            },
            title: place.name,
          });

          markersRef.current.set(place.place_id, marker);
          placedIdsRef.current.add(place.place_id);

          const address =
            place.formatted_address ?? place.vicinity ?? "";

          marker.addListener("click", () => {
            markerJustTapped.current = true;
            setTimeout(() => {
              markerJustTapped.current = false;
            }, 300);
            setShowDirections(false);
            setExpanded(false);
            setSelected({
              kind: "unlogged",
              place_id: place.place_id!,
              name: place.name ?? "Salon",
              lat: place.geometry!.location!.lat(),
              lng: place.geometry!.location!.lng(),
              address,
            });
          });
        }
      }

      const counts = salonsRef.current.map((s) => s.visit_count);
      const minCount = counts.length ? Math.min(...counts) : 1;
      const maxCount = counts.length ? Math.max(...counts) : 1;

      for (const salon of salonsRef.current) {
        placedIdsRef.current.add(salon.place_id);

        const t =
          maxCount > minCount
            ? (salon.visit_count - minCount) / (maxCount - minCount)
            : 0;
        const pinSize = Math.round(32 + t * 16);
        const pinH = Math.round(pinSize * 1.22);
        pinSizesRef.current.set(salon.place_id, pinSize);

        const marker = new window.google.maps.Marker({
          map,
          position: { lat: salon.lat, lng: salon.lng },
          icon: {
            url: makePinSvg(pinSize, false, "logged"),
            scaledSize: new window.google.maps.Size(pinSize, pinH),
            anchor: new window.google.maps.Point(pinSize / 2, pinH),
          },
          title: salon.name,
        });

        markersRef.current.set(salon.place_id, marker);

        marker.addListener("click", () => {
          markerJustTapped.current = true;
          setTimeout(() => {
            markerJustTapped.current = false;
          }, 300);
          setShowDirections(false);
          setExpanded(false);
          setSelected({ kind: "logged", ...salon });
        });
      }

      for (const salon of userSubmittedSalonsRef.current) {
        if (placedIdsRef.current.has(salon.place_id)) continue;
        placedIdsRef.current.add(salon.place_id);

        const pinSize = 28;
        const pinH = Math.round(pinSize * 1.22);
        pinSizesRef.current.set(salon.place_id, pinSize);

        const marker = new window.google.maps.Marker({
          map,
          position: { lat: salon.lat, lng: salon.lng },
          icon: {
            url: makePinSvg(pinSize, false, "user_submitted"),
            scaledSize: new window.google.maps.Size(pinSize, pinH),
            anchor: new window.google.maps.Point(pinSize / 2, pinH),
          },
          title: salon.name,
        });

        if (pickerReturnTo) {
          markersRef.current.set(salon.place_id, marker);
          pickerUserSubmittedIdsRef.current.add(salon.place_id);
          marker.addListener("click", () => {
            markerJustTapped.current = true;
            setTimeout(() => {
              markerJustTapped.current = false;
            }, 300);
            setShowDirections(false);
            setExpanded(false);
            setSelected({
              kind: "unlogged",
              place_id: salon.place_id,
              name: salon.name,
              lat: salon.lat,
              lng: salon.lng,
              address: "",
            });
          });
        }
      }

      map.addListener("click", () => {
        if (markerJustTapped.current) return;
        setSelected(null);
        setExpanded(false);
        setShowDirections(false);
      });

      setMapReady(true);

      service.textSearch(
        {
          query: MAP_ICE_TEXT_QUERY,
          location: map.getCenter(),
          radius: 3000,
        },
        (results: any[] | null, status: string) => {
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

    function startMap() {
      initMap(AMSTERDAM);
    }

    if (window.google?.maps) {
      startMap();
    } else {
      const existingScript = document.querySelector(
        `script[src*="maps.googleapis.com/maps/api/js"]`,
      );
      if (existingScript) {
        const interval = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(interval);
            startMap();
          }
        }, 100);
        return () => {
          clearInterval(interval);
          cleanupIdle();
        };
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.onload = startMap;
      document.head.appendChild(script);
    }

    return () => {
      cleanupIdle();
    };
  }, [salons, userSubmittedSalons, pickerReturnTo]);

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
      if (expanded) {
        setExpanded(false);
        setShowDirections(false);
      } else {
        setSelected(null);
      }
    }
  }

  function handleRequestMyLocation() {
    if (!mapReady || !mapInstanceRef.current) return;
    setLocationBannerMessage(null);

    if (userLocation) {
      mapInstanceRef.current.panTo(userLocation);
      return;
    }

    if (!navigator.geolocation) {
      setLocationBannerMessage("Location isn't supported in this browser.");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        mapInstanceRef.current?.panTo(loc);
        setLocationBannerMessage(null);
        setLocatingUser(false);
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationBannerMessage(LOCATION_DENIED_USER_MESSAGE);
        } else {
          setLocationBannerMessage("We couldn't get your location. Try again.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }

  function confirmPickerSelection() {
    if (!selected || !pickerReturnTo) return;
    const q = new URLSearchParams({
      place_id: selected.place_id,
      salon_name: selected.name,
    });
    router.push(`${pickerReturnTo}?${q.toString()}`);
  }

  const googleUrl = selected
    ? `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}&destination_place_id=${selected.place_id}`
    : "";
  const appleUrl = selected
    ? `maps://maps.apple.com/?daddr=${selected.lat},${selected.lng}`
    : "";

  const NAV_HEIGHT = 80;
  const floatingTop = pickerReturnTo ? "top-16" : "top-3";
  const toastTop = pickerReturnTo ? "top-24" : "top-3";
  /** Offset FAB below dismissible location banner when both are visible. */
  const locateFabTop =
    locationBannerMessage != null
      ? locationBannerMessage === LOCATION_DENIED_USER_MESSAGE
        ? pickerReturnTo
          ? "top-[11.5rem]"
          : "top-44"
        : pickerReturnTo
          ? "top-36"
          : "top-28"
      : floatingTop;

  return (
    <div className="fixed inset-0" style={{ zIndex: 10 }}>
      <div ref={mapRef} className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900" />

      {pickerReturnTo ? (
        <header
          className="absolute inset-x-0 top-0 z-[45] flex items-center gap-2 border-b border-zinc-200/90 bg-white/95 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95"
        >
          <button
            type="button"
            onClick={() => router.push(pickerReturnTo)}
            className="rounded-xl px-2 py-1 text-sm font-medium text-teal-600 dark:text-teal-400"
          >
            ← Back
          </button>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Choose salon
          </h2>
        </header>
      ) : null}

      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        </div>
      )}

      {showToast && (
        <div
          className={`pointer-events-none absolute inset-x-0 flex justify-center ${toastTop}`}
          style={{ zIndex: 50 }}
        >
          <div className="rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
            Use one finger to move the map
          </div>
        </div>
      )}

      {/* My location — requests geolocation only on tap (never on page load). */}
      {mapReady && (
        <button
          type="button"
          aria-label={
            userLocation ? "Centre map on my location" : "Use my location to centre the map"
          }
          onClick={handleRequestMyLocation}
          disabled={locatingUser}
          className={`absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-[top] disabled:opacity-60 dark:bg-zinc-800 ${locateFabTop}`}
          style={{ zIndex: 30 }}
        >
          {locatingUser ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-500 dark:border-zinc-600 dark:border-t-blue-400" />
          ) : (
            <GellogDirections size={20} className="text-blue-500" />
          )}
        </button>
      )}

      {locationBannerMessage ? (
        <div
          className={`absolute inset-x-3 ${floatingTop}`}
          style={{ zIndex: 35 }}
        >
          <LocationPermissionBanner
            message={locationBannerMessage}
            onDismiss={() => setLocationBannerMessage(null)}
            className="border-zinc-200 bg-white text-sm text-zinc-700 shadow-md dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            detail={
              locationBannerMessage === LOCATION_DENIED_USER_MESSAGE
                ? LOCATION_DENIED_TROUBLESHOOT_HINT
                : null
            }
          />
        </div>
      ) : null}

      {selected && (
        <div
          className="absolute inset-x-0 rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900"
          style={{ bottom: NAV_HEIGHT, zIndex: 40 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
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
                {selected.kind === "logged" ? (
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    ★ {selected.avg_rating.toFixed(1)} · {selected.visit_count}{" "}
                    {selected.visit_count === 1 ? "visit" : "visits"}
                  </p>
                ) : (
                  <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {selected.address || "Ice cream spot"}
                  </p>
                )}
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

          {pickerReturnTo ? (
            <div className="px-5 pb-3">
              <button
                type="button"
                onClick={confirmPickerSelection}
                className="w-full rounded-2xl bg-teal-500 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Use this salon
              </button>
            </div>
          ) : null}

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expanded ? "max-h-[60vh]" : "max-h-0"
            }`}
          >
            <div className="overflow-y-auto px-5 pb-6">
              {selected.kind === "logged" ? (
                <>
                  {selected.top_flavours.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
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
                  <div className="flex gap-3">
                    <Link
                      href={`/salon/${encodeURIComponent(selected.place_id)}`}
                      className="flex-1 rounded-2xl bg-teal-500 px-4 py-3 text-center text-sm font-semibold text-white"
                    >
                      View salon page →
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowDirections((v) => !v)}
                      className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      Get directions
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href={`/salon/${encodeURIComponent(selected.place_id)}`}
                    className="mb-3 block w-full rounded-2xl bg-teal-500/15 px-4 py-3 text-center text-sm font-medium text-teal-800 transition hover:bg-teal-500/25 dark:bg-teal-500/20 dark:text-teal-200 dark:hover:bg-teal-500/30"
                  >
                    No logs here yet — visit salon page
                  </Link>
                  <Link
                    href={`/salon/${encodeURIComponent(selected.place_id)}`}
                    className="mb-3 block w-full rounded-2xl bg-teal-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-600"
                  >
                    View salon page →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDirections((v) => !v)}
                    className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    Get directions
                  </button>
                </>
              )}

              {showDirections && (
                <div className="mt-3 flex flex-col gap-2">
                  <a
                    href={appleUrl}
                    className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-100 dark:ring-zinc-700"
                  >
                    🗺️ Open in Apple Maps
                  </a>
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 ring-1 ring-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-100 dark:ring-zinc-700"
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
