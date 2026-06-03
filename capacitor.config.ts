import type { CapacitorConfig } from "@capacitor/cli";

/**
 * SPIKE A — Remote-URL wrapper (throwaway, branch spike/capacitor-wrap).
 *
 * server.url points the native WebView at the live, Vercel-hosted Gellog app.
 * The native shell loads gellog.app directly; webDir is an unused placeholder
 * that only exists because the CLI requires it to be present for `cap add`.
 */
const config: CapacitorConfig = {
  appId: "app.gellog.wrapper",
  appName: "Gellog",
  webDir: "capacitor-webdir",
  server: {
    url: "https://www.gellog.app",
    cleartext: false,
  },
};

export default config;
