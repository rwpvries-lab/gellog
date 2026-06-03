"use client";

import { useState } from "react";
import { useIsNative } from "@/src/lib/useIsNative";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  // Consumer Stripe checkout is web-only; never expose it inside the native iOS app.
  const isNative = useIsNative();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        console.error(data.error ?? "checkout failed");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  if (isNative) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--brand-primary-hover)] disabled:opacity-70"
    >
      {loading ? (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden
        />
      ) : null}
      {loading ? "Redirecting…" : "Upgrade to Ice Cream+ – €2.99/mo"}
    </button>
  );
}
