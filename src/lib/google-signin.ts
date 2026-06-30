import { SocialLogin, type SocialLoginError } from "@capgo/capacitor-social-login";
import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  try {
    const { result } = await SocialLogin.login({
      provider: "google",
      options: {
        scopes: ["email", "profile"],
      },
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
    });
    if (error) throw error;
  } catch (err) {
    if (isUserCancelled(err)) {
      throw new GoogleSignInCancelled();
    }
    throw err;
  }
}
