import { hasCapacitorShellMarker, isCapacitorShell } from "@/src/lib/platform";

/**
 * One-time Terms of Use / Privacy acceptance gate (Apple Guideline 1.2 / EULA).
 *
 * Stored under a versioned key so a future terms revision can re-prompt simply by
 * bumping the version. Native iOS persists via Capacitor Preferences (survives
 * WebView storage clears); web uses localStorage.
 */
const TERMS_KEY = "terms_accepted_v1";
const BRIDGE_WAIT_MS = 500;
const BRIDGE_POLL_MS = 50;

type StorageStrategy =
  | "native-preferences"
  | "web-localStorage"
  | "ambiguous-fail-closed";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCapacitorBridge(): Promise<boolean> {
  const deadline = Date.now() + BRIDGE_WAIT_MS;
  while (Date.now() < deadline) {
    if (isCapacitorShell()) return true;
    await delay(BRIDGE_POLL_MS);
  }
  return isCapacitorShell();
}

async function resolveStorageStrategy(): Promise<StorageStrategy> {
  if (isCapacitorShell()) return "native-preferences";

  if (hasCapacitorShellMarker()) {
    if (await waitForCapacitorBridge()) return "native-preferences";
    return "ambiguous-fail-closed";
  }

  return "web-localStorage";
}

async function readNativePreferences(): Promise<boolean> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: TERMS_KEY });
    return value === "true";
  } catch {
    return false;
  }
}

function readWebLocalStorage(): boolean {
  try {
    return window.localStorage.getItem(TERMS_KEY) === "true";
  } catch {
    return false;
  }
}

export async function getTermsAccepted(): Promise<boolean> {
  const strategy = await resolveStorageStrategy();

  if (strategy === "native-preferences") {
    return readNativePreferences();
  }

  if (strategy === "web-localStorage") {
    return readWebLocalStorage();
  }

  return readNativePreferences();
}

export async function setTermsAccepted(): Promise<void> {
  const strategy = await resolveStorageStrategy();

  if (strategy === "web-localStorage") {
    try {
      window.localStorage.setItem(TERMS_KEY, "true");
    } catch {
      /* storage unavailable — gate will re-show next launch */
    }
    return;
  }

  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: TERMS_KEY, value: "true" });
  } catch {
    /* storage unavailable — gate will re-show next launch */
  }
}
