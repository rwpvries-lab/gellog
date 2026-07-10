import { isNativePlatform } from "@/src/lib/platform";

/**
 * Light haptic tap for key interactions (log publish, like, locate). No-op on
 * web/PWA — only fires inside the native Capacitor shell.
 */
export async function hapticImpactLight(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // best-effort — never block the action it's attached to
  }
}
