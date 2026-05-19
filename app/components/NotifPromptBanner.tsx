"use client";

import { requestNotificationPermission, subscribeToPush } from "@/src/lib/push";
import { GellogClose } from "@/src/components/icons";
import { useEffect, useState } from "react";

export function NotifPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("gellog-notif-asked")) return;
    if ("Notification" in window && Notification.permission !== "default") {
      localStorage.setItem("gellog-notif-asked", "1");
      return;
    }
    setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("gellog-notif-asked", "1");
    setVisible(false);
  }

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === "granted") await subscribeToPush();
    } finally {
      dismiss();
    }
  }

  if (!visible) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
      <p className="min-w-0 flex-1 text-sm font-medium text-[color:var(--text-primary)]">
        Get notified when friends log near you
      </p>
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className="flex-shrink-0 rounded-xl bg-[color:var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-inverse)] transition hover:bg-[color:var(--brand-primary-hover)] disabled:opacity-60"
      >
        {loading ? "…" : "Enable notifications"}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 text-[color:var(--brand-primary)] hover:opacity-70"
      >
        <GellogClose size={16} />
      </button>
    </div>
  );
}
