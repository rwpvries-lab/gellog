import { isNativePlatform } from "@/src/lib/platform";

/**
 * Opens an external/in-app document link. On native iOS this uses the Capacitor
 * Browser (ASWebAuthenticationSession-style in-app browser) so links like the
 * Terms / Privacy pages don't navigate away inside the wrapper WebView; on web it
 * opens a new tab.
 */
export async function openExternal(url: string): Promise<void> {
  if (isNativePlatform()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
