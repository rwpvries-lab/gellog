/**
 * Maps API / Supabase errors to copy safe for end users (no SQL, RLS jargon, etc.).
 */

function normalizeMessage(err: unknown): string {
  if (err instanceof Error && typeof err.message === "string") return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

/** True when the message is plausibly already user-facing (not a DB/API dump). */
function looksLikeSafeUserSentence(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 3 || t.length > 220) return false;
  if (
    /\b(pgrst|jwt|rls|sql|postgres|row-level|constraint|violates|detail:|hint:|uuid|internal server)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  if (/[{}[\]]/.test(t)) return false;
  return true;
}

/** Supabase Auth and similar sign-in / sign-up errors. */
export function userFacingAuthMessage(raw: string): string {
  const m = raw.trim();
  if (!m) return "Something went wrong. Please try again.";
  const l = m.toLowerCase();

  if (l.includes("invalid login credentials")) {
    return "We couldn't sign you in. Check your email and password.";
  }
  if (l.includes("email not confirmed") || l.includes("confirm your email")) {
    return "Please confirm your email address before signing in.";
  }
  if (l.includes("user already registered") || l.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (l.includes("password") && l.includes("at least")) {
    return m;
  }
  if (l.includes("invalid email") || l.includes("unable to validate email")) {
    return "That email doesn't look valid. Check for typos.";
  }
  if (l.includes("signup") && l.includes("disabled")) {
    return "Sign-ups are temporarily unavailable. Please try again later.";
  }
  if (l.includes("rate limit") || l.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (l.includes("network") || l.includes("failed to fetch")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }

  if (!looksLikeSafeUserSentence(m)) {
    return "Something went wrong. Please try again.";
  }
  return m;
}

/** Form save / upload failures (logs, storage, etc.). */
export function userFacingSaveError(err: unknown, fallback: string): string {
  const raw = normalizeMessage(err);
  if (!raw) return fallback;
  const l = raw.toLowerCase();

  if (l.includes("jwt") && (l.includes("expired") || l.includes("invalid"))) {
    return "Your session expired. Please sign in again and try once more.";
  }
  if (
    l.includes("row-level security") ||
    l.includes("violates row-level") ||
    (l.includes("permission denied") && l.includes("policy"))
  ) {
    return fallback;
  }
  if (l.includes("network") || l.includes("failed to fetch")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (l.includes("too large") || l.includes("payload too large") || l.includes("file size")) {
    return "That file is too large. Try a smaller image.";
  }
  if (l.includes("storage") && (l.includes("error") || l.includes("failed"))) {
    return "Upload failed. Please try again.";
  }

  if (looksLikeSafeUserSentence(raw)) return raw;
  return fallback;
}

/** Push / notification subscription failures (browser + service worker). */
export function userFacingPushError(err: unknown, fallback: string): string {
  const raw = normalizeMessage(err);
  if (!raw) return fallback;
  const l = raw.toLowerCase();

  if (l.includes("not supported") || l.includes("not available")) {
    return "Push notifications aren't available in this browser.";
  }
  if (l.includes("denied") && l.includes("permission")) {
    return "Permission denied. Enable notifications in your browser settings.";
  }
  if (l.includes("network") || l.includes("failed to fetch")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }

  if (looksLikeSafeUserSentence(raw)) return raw;
  return fallback;
}
