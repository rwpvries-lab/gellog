/**
 * Shared between app/layout.tsx (inline bootstrap script, reads on load) and
 * ClarityConsentBanner (writes on user choice) — must stay in sync.
 */
export const CLARITY_CONSENT_STORAGE_KEY = "gellog-clarity-consent";

export type ClarityConsentDecision = "granted" | "denied";
