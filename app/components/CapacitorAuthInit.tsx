"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { initCapacitorAuthListener } from "@/src/lib/capacitor-auth";

/**
 * Registers the native `appUrlOpen` deep-link listener that completes Google
 * OAuth on iOS. No-op on web/PWA. Rendered once from the root layout.
 */
export function CapacitorAuthInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    initCapacitorAuthListener();
  }, []);

  return null;
}
