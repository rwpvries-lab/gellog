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

/** @supabase/ssr stores the session in `document.cookie` (often chunked), not only localStorage. */
function clearSupabaseAuthCookies(): void {
  if (typeof document === "undefined") return;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const name = part.split("=")[0]?.trim();
    if (name?.startsWith("sb-")) {
      document.cookie = `${name}=; Max-Age=0; Path=/`;
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
    }
  }
}

/**
 * Remove all Supabase browser session data (cookies + localStorage).
 * Used after a failed refresh so the client stops retrying a dead session.
 */
export function clearSupabaseBrowserSession(): void {
  if (typeof window === "undefined") return;

  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("sb-")) keys.push(key);
  }
  for (const key of keys) {
    window.localStorage.removeItem(key);
  }

  clearSupabaseAuthCookies();
}

function clearInvalidAuthLocalStorage(): void {
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

function shouldClearSessionAfterTokenResponse(url: string, body: unknown): boolean {
  if (!url.includes("/auth/v1/token")) return false;
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  const desc = String(o.error_description ?? "").toLowerCase();
  const err = String(o.error ?? "").toLowerCase();
  // Wrong password uses invalid_grant + "Invalid login credentials" — do not clear session.
  if (desc.includes("login credentials") || desc.includes("invalid credentials")) {
    return false;
  }
  return (
    desc.includes("refresh token") ||
    desc.includes("refresh_token") ||
    (err === "invalid_grant" && desc.includes("refresh"))
  );
}

function createSessionAwareFetch(): typeof fetch {
  return async (input, init) => {
    const res = await fetch(input, init);

    if (typeof window === "undefined") return res;

    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input);

    if (!res.ok && url.includes("/auth/v1/token")) {
      try {
        const body: unknown = await res.clone().json();
        if (shouldClearSessionAfterTokenResponse(url, body)) {
          clearSupabaseBrowserSession();
        }
      } catch {
        /* non-JSON body */
      }
    }

    return res;
  };
}

export function createClient(): SupabaseClient {
  clearInvalidAuthLocalStorage();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: createSessionAwareFetch(),
      },
    },
  );
}
