/**
 * Shared between ClarityLoader (reads on mount, writes via loadClarityScript)
 * and ClarityConsentBanner (writes on user choice) — must stay in sync.
 */
export const CLARITY_CONSENT_STORAGE_KEY = "gellog-clarity-consent";

export type ClarityConsentDecision = "granted" | "denied";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

let clarityScriptLoaded = false;

/**
 * Injects the Microsoft Clarity tag script. Must only ever be called after an
 * explicit "granted" consent decision exists — never eagerly — so that no
 * request to clarity.ms fires before consent (GDPR requirement for EEA/UK/CH
 * traffic). Idempotent: safe to call from both the loader and the banner's
 * accept handler without double-injecting.
 */
export function loadClarityScript(projectId: string) {
  if (clarityScriptLoaded || typeof window === "undefined") return;
  clarityScriptLoaded = true;
  (function (c: Window, l: Document, a: "clarity", r: "script", i: string) {
    (c[a] as unknown) =
      c[a] ||
      function (...args: unknown[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((c[a] as any).q = (c[a] as any).q || []).push(args);
      };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = "https://www.clarity.ms/tag/" + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", projectId);
}
