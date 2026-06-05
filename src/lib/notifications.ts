import { isNativePlatform } from "./platform";
import { createClient } from "./supabase/client";
import {
  registerPushNotifications,
  unregisterPushNotifications,
} from "./native-push";
import {
  deletePushSubscription,
  requestNotificationPermission,
  subscribeToPush,
} from "./push";

/**
 * Unified push-permission state across web (PWA) and native (Capacitor/iOS).
 *
 * The web `Notification` global does not exist in WKWebView, so reading it
 * directly inside the native shell throws "Can't find variable: Notification".
 * Every UI surface (settings toggle, prompt banner) must go through these
 * helpers instead of touching `Notification` directly.
 */
export type PushPermission = "granted" | "denied" | "prompt";

/** Reads the current permission without prompting the user. */
export async function checkPushPermission(): Promise<PushPermission> {
  if (isNativePlatform()) {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    return perm.receive === "granted"
      ? "granted"
      : perm.receive === "denied"
        ? "denied"
        : "prompt";
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission === "default"
    ? "prompt"
    : (Notification.permission as PushPermission);
}

/**
 * Requests permission (if needed) and subscribes the device for push.
 * Returns the resulting permission state.
 */
export async function enablePush(): Promise<PushPermission> {
  if (isNativePlatform()) {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let perm = await PushNotifications.checkPermissions();
    if (
      perm.receive === "prompt" ||
      perm.receive === "prompt-with-rationale"
    ) {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      return perm.receive === "denied" ? "denied" : "prompt";
    }
    await registerPushNotifications(createClient());
    return "granted";
  }

  const permission = await requestNotificationPermission();
  if (permission === "granted") {
    await subscribeToPush();
    return "granted";
  }
  return permission === "denied" ? "denied" : "prompt";
}

/** Unsubscribes the device and stops it receiving push. */
export async function disablePush(): Promise<void> {
  if (isNativePlatform()) {
    await unregisterPushNotifications(createClient());
    return;
  }
  await deletePushSubscription();
}
