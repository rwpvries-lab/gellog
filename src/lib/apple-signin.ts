import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sign in with Apple — native iOS flow for the Capacitor wrapper.
 *
 * Apple is MANDATORY on iOS because the app offers Google sign-in (App Store
 * guideline 4.8). This helper is only ever exercised inside the native iOS
 * shell; on web/PWA `isAppleSignInAvailable()` returns false and the button is
 * never shown.
 *
 * Flow: generate a raw nonce, hand Apple its SHA-256 hash, then pass the RAW
 * nonce to Supabase, which re-hashes and matches it against the token Apple
 * signed. Apple only returns name/email on the FIRST authorization, so we persist
 * them to the `profiles` row immediately (see `syncAppleProfile`).
 *
 * `SignInWithApple` is imported statically so the plugin registers with Capacitor
 * without a runtime chunk fetch — dynamic import() can hang in the remote-URL
 * WebView when the async chunk never resolves.
 */

export function isAppleSignInAvailable(): boolean {
  return Capacitor.getPlatform() === "ios";
}

export interface AppleProfileSeed {
  givenName?: string | null;
  familyName?: string | null;
  email?: string | null;
}

/** Random URL-safe string used as the raw nonce. */
function randomNonce(length = 32): string {
  const charset =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join("");
}

/** Hex-encoded SHA-256 — used for Apple Sign-In nonce hashing. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Reject after `ms` so the caller's catch/finally can recover when the native
 * sheet never presents or the bridge never resolves.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Persists Apple's first-sign-in name to the user's `profiles` row.
 *
 * Apple sends the user's name ONLY on the first authorization; every later
 * sign-in returns an empty name. So:
 *  - First sign-in (no profile row yet) → create the row, capturing the name.
 *  - Existing row with empty `display_name` + a name from Apple → backfill it once.
 *  - Subsequent sign-ins (name empty) → leave the stored `display_name` as the
 *    source of truth; nothing to write.
 *
 * Mirrors the username derivation used by the OAuth web callback
 * (`app/auth/callback/route.ts`); native sign-in skips that route.
 */
export async function syncAppleProfile(
  supabase: SupabaseClient,
  seed: AppleProfileSeed,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const appleName = [seed.givenName, seed.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();

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
        .slice(0, 24) || "user";
    // Apple private-relay prefixes are unique, but a bare-email fallback can
    // collide — a short random suffix keeps the unique `username` constraint safe.
    const username = email ? base : `${base}_${Math.random().toString(36).slice(2, 8)}`;

    await supabase.from("profiles").insert({
      id: user.id,
      username,
      display_name: appleName || null,
    });
    return;
  }

  if (appleName && !existing.display_name) {
    await supabase
      .from("profiles")
      .update({ display_name: appleName })
      .eq("id", user.id);
  }
}

/**
 * Runs the native Apple sheet and exchanges the identity token for a Supabase
 * session. Returns the first-sign-in profile data (name/email) so the caller can
 * persist it — it will NOT be available on subsequent sign-ins.
 */
export async function signInWithApple(
  supabase: SupabaseClient,
): Promise<{ profile: AppleProfileSeed }> {
  return withTimeout(
    signInWithAppleInner(supabase),
    45_000,
    "Apple sign-in timed out. The sign-in sheet didn't open — please try again.",
  );
}

async function signInWithAppleInner(
  supabase: SupabaseClient,
): Promise<{ profile: AppleProfileSeed }> {
  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  const result = await SignInWithApple.authorize({
    // Required by plugin typings (web OAuth); native iOS ignores these fields.
    clientId: "com.sidusstudio.gellog",
    redirectURI: "https://www.gellog.app",
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

  const profile: AppleProfileSeed = {
    givenName: result.response.givenName ?? null,
    familyName: result.response.familyName ?? null,
    email: result.response.email ?? null,
  };

  // Capture Apple's name now — it is gone on every subsequent sign-in.
  await syncAppleProfile(supabase, profile);

  return { profile };
}
