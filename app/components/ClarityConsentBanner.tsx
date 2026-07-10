"use client";

import { useLayoutEffect, useState } from "react";
import {
  CLARITY_CONSENT_STORAGE_KEY,
  loadClarityScript,
  type ClarityConsentDecision,
} from "@/src/lib/clarity-consent";

function applyConsent(decision: ClarityConsentDecision, projectId: string) {
  // The script may never have loaded yet (ClarityLoader only loads it for an
  // *existing* grant) — this is the first-ever "granted" moment, so load it
  // now. No-ops if already loaded or if the decision is "denied".
  if (decision === "granted") {
    loadClarityScript(projectId);
  }
  window.clarity?.("consentv2", {
    ad_Storage: decision,
    analytics_Storage: decision,
  });
}

/**
 * Required for EEA/UK/CH traffic since Clarity started enforcing a consent
 * signal on 2025-10-31. Without an explicit "granted" decision, Clarity's
 * script is never even loaded (see ClarityLoader / loadClarityScript) — so
 * no clarity.ms request fires until the user accepts here.
 */
export function ClarityConsentBanner({ projectId }: { projectId: string }) {
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(CLARITY_CONSENT_STORAGE_KEY);
        if (stored !== "granted" && stored !== "denied") setVisible(true);
      } catch {
        // localStorage unavailable — skip the banner rather than block the app
      }
    });
  }, []);

  function decide(decision: ClarityConsentDecision) {
    try {
      localStorage.setItem(CLARITY_CONSENT_STORAGE_KEY, decision);
    } catch {
      // ignore — banner will just re-show next visit
    }
    applyConsent(decision, projectId);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-3 border-t border-zinc-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        We use Microsoft Clarity to record anonymised session analytics and
        heatmaps so we can improve Gellog.{" "}
        <a href="/privacy" className="underline hover:no-underline">
          Privacy Policy
        </a>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => decide("denied")}
          className="pressable rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => decide("granted")}
          className="pressable rounded-lg bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-[color:var(--text-inverse)] hover:bg-[color:var(--brand-primary-hover)]"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
