"use client";

import { useState } from "react";
import type { Tier } from "./types";

type Props = {
  placeId: string;
  tier: Exclude<Tier, "free">;
  label: string;
  className?: string;
};

/** Shared upgrade CTA — replaces the 3 near-identical copies that used to live in DashboardClient/AnalyticsSection. */
export function UpgradeButton({ placeId, tier, label, className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/salon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId, tier }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[color:var(--brand-primary-hover)] disabled:opacity-70 ${className}`}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden
        />
      )}
      {loading ? "Redirecting…" : label}
    </button>
  );
}
