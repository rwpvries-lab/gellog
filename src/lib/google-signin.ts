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

export interface GoogleProfileSeed {
  name?: string | null;
  email?: string | null;
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
 * Ensures a `profiles` row exists after native Google sign-in.
 * Native sign-in skips the OAuth web callback (`app/auth/callback/route.ts`).
 */
export async function syncGoogleProfile(
  supabase: SupabaseClient,
  seed: GoogleProfileSeed = {},
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const displayName = seed.name?.trim() || null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const email = user.email ?? seed.email ?? "";
    const base =
      email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 30) || "user";

    await supabase.from("profiles").insert({
      id: user.id,
      username: base,
      display_name: displayName,
    });
    return;
  }

  if (displayName && !existing.display_name) {
    await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
  }
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
    // Do not pass custom scopes here: on Android the plugin rejects scoped login
    // unless MainActivity implements ModifiedMainActivityForSocialLoginPlugin.
    // Default OIDC scopes (email, profile, openid) are sufficient.
    const { result } = await SocialLogin.login({
      provider: "google",
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

    await syncGoogleProfile(supabase, {
      name: result.profile?.name ?? null,
      email: result.profile?.email ?? null,
    });
  } catch (err) {
    if (isUserCancelled(err)) {
      throw new GoogleSignInCancelled();
    }
    throw err;
  }
}
