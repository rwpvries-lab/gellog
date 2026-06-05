import { isNativePlatform } from "@/src/lib/platform";

export type GeolocationPermissionState = "granted" | "denied" | "prompt";

/**
 * Reads the current geolocation permission state in a way that is reliable on
 * both web and the native iOS shell.
 *
 * - Native iOS: `navigator.permissions.query({ name: 'geolocation' })` is
 *   unreliable inside WKWebView (it often reports `prompt`/`denied` even when
 *   the user has granted access via the system prompt), so we read the real
 *   state from `@capacitor/geolocation`'s `checkPermissions()`.
 * - Web/PWA: delegates to the standard Permissions API.
 *
 * Returns `"prompt"` whenever the state can't be determined.
 */
export async function checkGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const status = await Geolocation.checkPermissions();
      if (status.location === "granted") return "granted";
      if (status.location === "denied") return "denied";
      return "prompt";
    } catch {
      return "prompt";
    }
  }

  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "prompt";
  }
  try {
    const status = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
}

/**
 * Drop-in replacement for `navigator.geolocation.getCurrentPosition` with the
 * identical `(success, error?, options?)` signature, so call sites only swap the
 * function reference.
 *
 * - Native iOS: routes through `@capacitor/geolocation`, which drives the system
 *   permission prompt (purpose string lives in Info.plist) and returns a more
 *   reliable fix than the WKWebView's `navigator.geolocation`.
 * - Web/PWA: delegates straight to the browser API — behaviour is unchanged.
 *
 * Native results are normalised to the standard `GeolocationPosition` /
 * `GeolocationPositionError` shapes so existing callers (which read
 * `coords.latitude/longitude` and check `err.code === err.PERMISSION_DENIED`)
 * keep working without changes.
 */
export function getCurrentPosition(
  success: PositionCallback,
  error?: PositionErrorCallback,
  options?: PositionOptions,
): void {
  if (isNativePlatform()) {
    void requestNativePosition(success, error, options);
    return;
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    error?.(makePositionError(2, "Geolocation is not available."));
    return;
  }
  navigator.geolocation.getCurrentPosition(success, error, options);
}

async function requestNativePosition(
  success: PositionCallback,
  error: PositionErrorCallback | undefined,
  options: PositionOptions | undefined,
): Promise<void> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");

    const perm = await Geolocation.requestPermissions({
      permissions: ["location"],
    });
    if (perm.location === "denied" && perm.coarseLocation === "denied") {
      error?.(makePositionError(1, "Location permission denied."));
      return;
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? false,
      timeout: options?.timeout ?? 10_000,
      maximumAge: options?.maximumAge ?? 0,
    });

    success(toGeolocationPosition(pos));
  } catch (e) {
    error?.(
      makePositionError(2, e instanceof Error ? e.message : "Location unavailable."),
    );
  }
}

interface NativeCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

function toGeolocationPosition(pos: {
  coords: NativeCoords;
  timestamp: number;
}): GeolocationPosition {
  return {
    coords: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude ?? null,
      altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
      heading: pos.coords.heading ?? null,
      speed: pos.coords.speed ?? null,
      toJSON() {
        return this;
      },
    },
    timestamp: pos.timestamp,
    toJSON() {
      return this;
    },
  } as GeolocationPosition;
}

function makePositionError(code: number, message: string): GeolocationPositionError {
  return {
    code,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}
