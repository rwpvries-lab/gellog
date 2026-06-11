import { Capacitor } from "@capacitor/core";
import { createClient } from "@/src/lib/supabase/client";

/**
 * Native deep-link auth handler for the Capacitor iOS wrapper.
 *
 * Google OAuth on iOS runs in ASWebAuthenticationSession (via `@capacitor/browser`)
 * because Google blocks OAuth inside an embedded WKWebView. Supabase redirects back
 * to `gellog://auth/callback?code=…`, which iOS routes to the app as an `appUrlOpen`
 * event. We extract the PKCE `code` and exchange it for a session here — this is the
 * native equivalent of the web `/auth/callback/route.ts` server handler, which the
 * native flow bypasses entirely.
 *
 * Apple Sign-In does NOT use this path (it's native `signInWithIdToken`); leave it alone.
 */

let listenerRegistered = false;

interface AppUrlOpenEvent {
  url: string;
}

/**
 * Registers the `appUrlOpen` listener (iOS only, once per app session). Call from a
 * top-level client layout inside a `useEffect`. No-op on web/PWA.
 */
export function initCapacitorAuthListener(): void {
  if (!Capacitor.isNativePlatform()) return;
  if (listenerRegistered) return;
  listenerRegistered = true;

  void (async () => {
    // Indirect import so the web/PWA bundle never resolves the native module.
    const { App } = await import("@capacitor/app");

    void App.addListener("appUrlOpen", (event: AppUrlOpenEvent) => {
      void handleAuthDeepLink(event.url);
    });
  })();
}

/**
 * Parses a `gellog://auth/callback` deep link, exchanges the `code` for a Supabase
 * session, and navigates to `/feed` on success or `/login?error=…` on failure.
 */
async function handleAuthDeepLink(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }

  // Only handle our auth callback deep link; ignore any other inbound URLs.
  if (url.protocol !== "gellog:" || !url.href.includes("auth/callback")) return;

  const code = url.searchParams.get("code");

  // Close the in-app browser sheet now that control is back in the app.
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* sheet may already be dismissed */
  }

  if (!code) {
    window.location.assign("/login?error=auth_callback_error");
    return;
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    window.location.assign("/login?error=auth_callback_error");
    return;
  }

  window.location.assign("/feed");
}
