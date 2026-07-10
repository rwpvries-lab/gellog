"use client";

import { useLayoutEffect } from "react";
import {
  CLARITY_CONSENT_STORAGE_KEY,
  loadClarityScript,
} from "@/src/lib/clarity-consent";

/**
 * Loads Microsoft Clarity only when a "granted" consent decision already
 * exists in localStorage — never eagerly. This is what actually enforces the
 * "no clarity.ms requests before consent" requirement; ClarityConsentBanner
 * only owns the banner UI and calls loadClarityScript() directly on accept
 * (the first-ever grant, before this effect would otherwise see it).
 */
export function ClarityLoader({ projectId }: { projectId: string }) {
  useLayoutEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(CLARITY_CONSENT_STORAGE_KEY);
        if (stored === "granted") {
          loadClarityScript(projectId);
          window.clarity?.("consentv2", {
            ad_Storage: "granted",
            analytics_Storage: "granted",
          });
        }
      } catch {
        // localStorage unavailable — skip rather than block the app
      }
    });
  }, [projectId]);

  return null;
}
