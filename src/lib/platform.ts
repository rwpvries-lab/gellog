import { Capacitor } from "@capacitor/core";

type CapacitorWindow = Window & {
  androidBridge?: unknown;
  webkit?: { messageHandlers?: { bridge?: unknown } };
  WEBVIEW_SERVER_URL?: string;
};

export type PlatformContext = "web" | "shell" | "ambiguous-shell";

/**
 * True only inside the native Capacitor shell (iOS app), false on web/PWA.
 *
 * Imperative counterpart to the `useIsNative()` hook — use this inside event
 * handlers, effects, and library helpers; use the hook for render-time gating.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * True when JavaScript runs inside a Capacitor WebView, including the remote-URL
 * wrapper where `Capacitor.isNativePlatform()` can briefly report `false` before
 * the native bridge is attached.
 */
export function isCapacitorShell(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === "undefined") return false;

  const w = window as CapacitorWindow;
  return Boolean(w.androidBridge ?? w.webkit?.messageHandlers?.bridge);
}

/**
 * Synchronous Capacitor-shell marker injected by the native host at
 * `document.start` (see Capacitor `JSExport.exportCapacitorGlobalJS`). Present
 * in the WKWebView before `native-bridge.js` finishes wiring
 * `webkit.messageHandlers.bridge`, and absent in a normal browser tab loading
 * the same remote URL.
 */
export function hasCapacitorShellMarker(): boolean {
  if (typeof window === "undefined") return false;

  const url = (window as CapacitorWindow).WEBVIEW_SERVER_URL;
  return typeof url === "string" && url.length > 0;
}

/**
 * Classifies the runtime for storage/routing decisions:
 * - `shell`: bridge ready — safe to call native plugins
 * - `ambiguous-shell`: native host marker present, bridge not ready yet
 * - `web`: no native host markers — treat as a browser tab
 */
export function getPlatformContext(): PlatformContext {
  if (isCapacitorShell()) return "shell";
  if (hasCapacitorShellMarker()) return "ambiguous-shell";
  return "web";
}
