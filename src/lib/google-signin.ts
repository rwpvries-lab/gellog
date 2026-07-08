import { SocialLogin, type SocialLoginError } from "@capgo/capacitor-social-login";
import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerPushNotifications } from "@/src/lib/native-push";

/**
 * Native Google Sign-In for the Capacitor iOS and Android shells (Option A remote URL).
 *
 * Uses @capgo/capacitor-social-login to obtain an idToken in-process — no browser
 * handoff, no deep-link round-trip. Web/PWA continues to use Supabase OAuth redirect.
 */

const IOS_CLIENT_ID =
  "762912343297-fk7tgm52bdrprsbbrpj06vb6m9qkomrj.apps.googleusercontent.com";

// Web Application client ID from Google Cloud Console (OAuth 2.0 → type: Web application).
// Required for native Google Sign-In on Android via the Credential Manager API.
// Android OAuth client (type: Android) with the keystore SHA-1 must also be registered
// in the same GCP project, and google-services.json regenerated to include it.
const ANDROID_WEB_CLIENT_ID =
  "762912343297-kl9hpbfgehluq749uk3t8763hmce14g1.apps.googleusercontent.com";

let initialized = false;

/** True inside any native Capacitor shell (iOS or Android). */
export function isNativeGoogleShell(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

/** @deprecated use isNativeGoogleShell */
export const isIosGoogleNativeShell = isNativeGoogleShell;

export class GoogleSignInCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "GoogleSignInCancelled";
  }
}

function isUserCancelled(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return (err as SocialLoginError).code === "USER_CANCELLED";
}

/**
 * Generates a raw/hashed nonce pair for the iOS Google sign-in flow.
 *
 * GIDSignIn (the native SDK behind the iOS Google button) embeds its own
 * random nonce into the returned id_token's `nonce` claim even when none is
 * passed in. Supabase's signInWithIdToken hashes whatever nonce you give it
 * and compares that against the claim, so the hashed value must go to Google
 * (echoed verbatim into the id_token) and the raw value must go to Supabase.
 */
async function generateNoncePair(): Promise<{ raw: string; hashed: string }> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hashed = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  return { raw, hashed };
}

async function ensureGoogleSignInInitialized(): Promise<void> {
  if (initialized) return;
  await SocialLogin.initialize({
    google: {
      iOSClientId: IOS_CLIENT_ID,
      webClientId: ANDROID_WEB_CLIENT_ID,
      mode: "online",
    },
  });
  initialized = true;
}

/**
 * Runs the native Google sheet and exchanges the identity token for a Supabase session.
 * Throws {@link GoogleSignInCancelled} when the user dismisses the sheet (silent).
 */
export async function signInWithGoogle(
  supabase: SupabaseClient,
): Promise<void> {
  await ensureGoogleSignInInitialized();

  // Only iOS's GIDSignIn auto-embeds a nonce claim into the id_token (see
  // generateNoncePair above). Android's Credential Manager flow doesn't
  // exhibit this and already signs in successfully without a nonce, so it's
  // left untouched here to avoid regressing it.
  const noncePair =
    Capacitor.getPlatform() === "ios" ? await generateNoncePair() : null;

  try {
    // No `scopes` here on purpose: email/profile are already in the default
    // ID token claims, and requesting scopes on Android triggers a separate
    // Credential Manager authorization screen that requires MainActivity to
    // override onActivityResult() — which this app's MainActivity doesn't do.
    // Without that wiring the plugin fails native-side, and the failure
    // surfaces to JS as a generic "SocialLogin plugin is not implemented on
    // android" instead of the real error. iOS has no such requirement, which
    // is why this only broke on Android.
    // forcePrompt is required whenever we're using a nonce: the plugin only
    // threads `nonce` through its fresh-login path. If this device has ever
    // signed in before, GIDSignIn.hasPreviousSignIn() is true (persisted in
    // the Keychain) and the plugin silently takes a restorePreviousSignIn()
    // -> refreshTokensIfNeeded() path instead, which never receives our
    // nonce at all — yet we'd still send Supabase a nonce that has nothing
    // to match in the id_token, reproducing the exact same mismatch error.
    // Forcing the prompt skips that silent-restore path so nonce is always
    // honored, at the cost of always showing the account picker on iOS.
    const { result } = await SocialLogin.login({
      provider: "google",
      options: noncePair ? { nonce: noncePair.hashed, forcePrompt: true } : {},
    });

    if (result.responseType !== "online") {
      throw new Error("Unexpected offline Google sign-in response.");
    }

    const idToken = result.idToken;
    if (!idToken) {
      throw new Error("Google did not return an identity token.");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      ...(noncePair ? { nonce: noncePair.raw } : {}),
    });
    if (error) throw error;
  } catch (err) {
    if (isUserCancelled(err)) {
      throw new GoogleSignInCancelled();
    }
    throw err;
  }
}

type AppRouterLike = {
  push: (href: string) => void;
  refresh: () => void;
};

/**
 * Shared post-auth path for native Google sign-in — used identically by
 * /login and /signup so a first-time user is handled the same way from
 * either entry point.
 *
 * Navigates first, then defers push-notification registration well past
 * the RSC round-trip. On a first-ever call, registerPushNotifications()
 * shows a native OS permission dialog; firing that too early (previously a
 * bare `setTimeout(fn, 0)` on the login page only, and not called at all
 * on signup) can interrupt the in-flight router.refresh() navigation and
 * strand the user on a stale, unauthenticated render — which is why only
 * first-time /login looked broken while /signup (which never called
 * registerPushNotifications) didn't, and why a second /login attempt
 * always worked (the permission prompt only shows once). This mirrors the
 * Android POST_NOTIFICATIONS race fixed in 45551ac, tuned with enough
 * delay to survive a real network round-trip instead of just the next tick.
 */
export async function completeGoogleSignIn(
  supabase: SupabaseClient,
  router: AppRouterLike,
  next: string,
): Promise<void> {
  await signInWithGoogle(supabase);
  router.push(next);
  router.refresh();
  setTimeout(() => void registerPushNotifications(supabase), 500);
}
