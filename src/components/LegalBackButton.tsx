"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/src/components/icons";

/**
 * Native-style back control for the legal document pages. Uses `router.back()`
 * so it returns the user to wherever they came from (Settings in the app),
 * giving an obvious tap target instead of relying on the iOS swipe-back gesture.
 */
export function LegalBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="-ml-1 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--brand-secondary)] transition-colors hover:text-[color:var(--brand-primary)]"
      aria-label="Back"
    >
      <Icon name="GellogBack" size={20} strokeWidth={2} />
      Back
    </button>
  );
}
