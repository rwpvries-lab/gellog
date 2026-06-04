import { isNativePlatform } from "@/src/lib/platform";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Native push notifications (iOS) via @capacitor/push-notifications.
 *
 * Web/PWA push (VAPID + service worker) lives separately in `src/lib/push.ts`;
 * this module is the APNs path and no-ops off-native.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TODO(APNs key) — pending the approved Apple Developer account. The app-side
 * wiring below + the `aps-environment` entitlement are done; what remains is
 * server/portal config so APNs will actually deliver:
 *   1. Apple Developer portal → Certificates, IDs & Profiles → Keys → create
 *      an APNs Auth Key (.p8). Note the Key ID and your Team ID.
 *   2. Enable the "Push Notifications" capability on the App ID
 *      `com.sidusstudio.gellog` (regenerates provisioning profiles).
 *   3. Store the .p8 + Key ID + Team ID + bundle ID as secrets in whatever
 *      sends the pushes (e.g. a Supabase Edge Function calling APNs over HTTP/2
 *      at api.push.apple.com, or a worker reading the `device_tokens` table).
 *   4. Switch `aps-environment` in App.entitlements to `production` for
 *      TestFlight/App Store builds.
 * Until then, registration + token storage work; delivery is a no-op.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Branded pre-permission rationale (iOS does not allow customising the system prompt text). */
export const PUSH_RATIONALE =
  "Get notified when friends log gelato near you.";

let registered = false;

export async function registerPushNotifications(
  supabase: SupabaseClient,
): Promise<void> {
  if (!isNativePlatform()) return;
  if (registered) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    // Show PUSH_RATIONALE in a pre-permission screen before this call to explain
    // the ask; the system dialog itself cannot be customised on iOS.
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return;

  registered = true;

  await PushNotifications.addListener("registration", (token) => {
    void storeDeviceToken(supabase, token.value);
  });

  await PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error", err);
  });

  // Foreground receipt — hook for an in-app toast / badge update later.
  await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.debug("Push received", notification);
  });

  // Tap on a notification → deep-link to the relevant log, else the feed.
  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      routeFromNotification(action.notification.data);
    },
  );

  await PushNotifications.register();
}

async function storeDeviceToken(
  supabase: SupabaseClient,
  token: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("device_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform: "ios",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" },
  );
}

function routeFromNotification(data: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const logId = typeof data?.logId === "string" ? data.logId : undefined;
  window.location.href = logId ? `/log/${logId}` : "/icecream/feed";
}
