import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Remote-URL wrapper: the native WebView loads the live, Vercel-hosted Gellog
 * app directly. `webDir` is an unused placeholder that only exists because the
 * CLI requires it to be present for `cap add`/`cap sync`.
 */
const config: CapacitorConfig = {
  appId: 'com.sidusstudio.gellog',
  appName: 'Gellog',
  webDir: 'capacitor-webdir',
  server: {
    url: 'https://www.gellog.app',
    cleartext: false,
  },
};

export default config;
