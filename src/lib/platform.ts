import { Capacitor } from "@capacitor/core";

/**
 * True only inside the native Capacitor shell (iOS app), false on web/PWA.
 *
 * Imperative counterpart to the `useIsNative()` hook — use this inside event
 * handlers, effects, and library helpers; use the hook for render-time gating.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
