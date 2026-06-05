import { isNativePlatform } from "@/src/lib/platform";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Native push notifications (iOS) via @capacitor/push-notifications.
 *
 * Web/PWA push (VAPID + service worker) lives separately in `src/lib/push.ts`;
 * this module is the APNs path and no-ops off-native.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * APNs delivery is wired in `native-push-server.ts` (`sendPushToUser`), which
 * signs an ES256 provider token and pushes over HTTP/2 to api.push.apple.com.
 * Credentials live in Vercel env vars, not in code:
 *   APNS_PRIVATE_KEY  full .p8 contents (incl. BEGIN/END lines)
 *   APNS_KEY_ID       ABP9JKN426
 *   APNS_TEAM_ID      7N5C924G3K
 *   APNS_BUNDLE_ID    (optional) push topic, defaults to com.sidusstudio.gellog
 *   APNS_PRODUCTION   "true" only for TestFlight/App Store builds (else sandbox)
 *
 * Remaining manual steps (Apple portal / Xcode, not code):
 *   1. APNs Auth Key (.p8) created — Key ID ABP9JKN426, Team ID 7N5C924G3K. ✓
 *   2. "Push Notifications" capability enabled on App ID com.sidusstudio.gellog
 *      (regenerate provisioning profiles after enabling).
 *   3. For TestFlight/App Store: switch `aps-environment` in App.entitlements
 *      to `production` and set APNS_PRODUCTION=true in Vercel.
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
