import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sign in with Apple — native iOS flow for the Capacitor wrapper.
 *
 * Apple is MANDATORY on iOS because the app offers Google sign-in (App Store
 * guideline 4.8). This helper is only ever exercised inside the native iOS
 * shell; on web/PWA `isAppleSignInAvailable()` returns false and the button is
 * never shown.
 *
 * Flow (see plan): generate a raw nonce, hand Apple its SHA-256 hash, then pass
 * the RAW nonce to Supabase, which re-hashes and matches it against the token
 * Apple signed. Apple only returns name/email on the FIRST authorization, so we
 * surface them to the caller to persist immediately.
 *
 * NOTE: `@capacitor-community/apple-sign-in` is not installed yet — that step is
 * gated on the approved Apple Developer account (App ID + SIWA capability). The
 * import below is intentionally indirect so the web build stays green until then.
 */

export function isAppleSignInAvailable(): boolean {
  return Capacitor.getPlatform() === "ios";
}

interface AppleAuthorizeResponse {
  response: {
    identityToken?: string;
    givenName?: string | null;
    familyName?: string | null;
    email?: string | null;
  };
}

interface AppleSignInPlugin {
  authorize(options: {
    clientId?: string;
    redirectURI?: string;
    scopes?: string;
    state?: string;
    nonce?: string;
  }): Promise<AppleAuthorizeResponse>;
}

/** Random URL-safe string used as the raw nonce. */
function randomNonce(length = 32): string {
  const charset =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join("");
}

/** Hex-encoded SHA-256 of the raw nonce — this is what Apple bakes into the token. */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function loadPlugin(): Promise<AppleSignInPlugin> {
  // Indirect specifier keeps the bundler from hard-resolving the (not-yet-installed) package.
  const pkg = "@capacitor-community/apple-sign-in";
  const mod = (await import(/* webpackIgnore: true */ pkg)) as {
    SignInWithApple: AppleSignInPlugin;
  };
  return mod.SignInWithApple;
}

export interface AppleProfileSeed {
  givenName?: string | null;
  familyName?: string | null;
  email?: string | null;
}

/**
 * Runs the native Apple sheet and exchanges the identity token for a Supabase
 * session. Returns the first-sign-in profile data (name/email) so the caller can
 * persist it — it will NOT be available on subsequent sign-ins.
 */
export async function signInWithApple(
  supabase: SupabaseClient,
): Promise<{ profile: AppleProfileSeed }> {
  const SignInWithApple = await loadPlugin();

  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  const result = await SignInWithApple.authorize({
    scopes: "name email",
    nonce: hashedNonce,
  });

  const identityToken = result.response.identityToken;
  if (!identityToken) {
    throw new Error("Apple did not return an identity token.");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  return {
    profile: {
      givenName: result.response.givenName ?? null,
      familyName: result.response.familyName ?? null,
      email: result.response.email ?? null,
    },
  };
}
