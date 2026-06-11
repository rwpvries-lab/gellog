import { isNativePlatform } from "@/src/lib/platform";

/**
 * One-time Terms of Use / Privacy acceptance gate (Apple Guideline 1.2 / EULA).
 *
 * Stored under a versioned key so a future terms revision can re-prompt simply by
 * bumping the version. Native iOS persists via Capacitor Preferences (survives
 * WebView storage clears); web uses localStorage.
 */
const TERMS_KEY = "terms_accepted_v1";

export async function getTermsAccepted(): Promise<boolean> {
  if (isNativePlatform()) {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: TERMS_KEY });
    return value === "true";
  }
  try {
    return window.localStorage.getItem(TERMS_KEY) === "true";
  } catch {
    return false;
  }
}

export async function setTermsAccepted(): Promise<void> {
  if (isNativePlatform()) {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: TERMS_KEY, value: "true" });
    return;
  }
  try {
    window.localStorage.setItem(TERMS_KEY, "true");
  } catch {
    /* storage unavailable — gate will re-show next launch, acceptable fallback */
  }
}
