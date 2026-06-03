"use client";

import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";

/**
 * True only inside the native Capacitor shell (iOS app), false on web/PWA.
 *
 * The native shell loads the same deployed site as the browser (remote-URL
 * wrapper), so the platform can only be told apart at runtime — a build-time
 * flag can't, because one build serves both.
 *
 * `useSyncExternalStore` reads the platform without a hydration mismatch: the
 * server snapshot is always `false` (matching SSR), and the client snapshot is
 * applied after hydration. The platform never changes within a session, so the
 * subscribe callback is a no-op.
 */
const subscribe = () => () => {};
const getSnapshot = () => Capacitor.isNativePlatform();
const getServerSnapshot = () => false;

export function useIsNative(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
