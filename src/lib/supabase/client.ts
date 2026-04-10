import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function hasValidRefreshToken(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const sessionLike = value as {
    refresh_token?: unknown;
    currentSession?: { refresh_token?: unknown } | null;
  };

  if (typeof sessionLike.refresh_token === "string" && sessionLike.refresh_token.length > 0) {
    return true;
  }

  if (
    sessionLike.currentSession &&
    typeof sessionLike.currentSession.refresh_token === "string" &&
    sessionLike.currentSession.refresh_token.length > 0
  ) {
    return true;
  }

  return false;
}

function clearInvalidAuthStorage(): void {
  if (typeof window === "undefined") return;

  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;

      // Supabase session payloads changed formats across SDK versions.
      // Treat missing/empty refresh token as invalid and clear it.
      if (Array.isArray(parsed)) {
        const refreshToken = parsed[1];
        if (typeof refreshToken !== "string" || refreshToken.length === 0) {
          window.localStorage.removeItem(key);
        }
        continue;
      }

      if (!hasValidRefreshToken(parsed)) {
        window.localStorage.removeItem(key);
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }
}

export function createClient(): SupabaseClient {
  clearInvalidAuthStorage();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
