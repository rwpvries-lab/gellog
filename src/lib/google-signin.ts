import { SocialLogin, type SocialLoginError } from "@capgo/capacitor-social-login";
import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Native Google Sign-In for the Capacitor iOS shell (Option A remote URL).
 *
 * Uses @capgo/capacitor-social-login to obtain an idToken in-process — no browser
 * handoff, no deep-link round-trip. Web/PWA continues to use Supabase OAuth redirect.
 */

const IOS_CLIENT_ID =
  "762912343297-fk7tgm52bdrprsbbrpj06vb6m9qkomrj.apps.googleusercontent.com";

let initialized = false;

/** True inside the iOS Capacitor shell (native runtime, Option A remote-URL). */
export function isIosGoogleNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

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
