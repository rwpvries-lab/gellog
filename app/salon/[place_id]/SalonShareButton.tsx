"use client";

import { Toast, useToast, copyToClipboard } from "@/src/components/Toast";
import { Icon } from "@/src/components/icons";

type Props = {
  salonName: string;
  placeId: string;
  visitCount: number;
};

export function SalonShareButton({ salonName, placeId, visitCount }: Props) {
  const { toast, showToast, dismissToast } = useToast();

  async function handleShare() {
    const url = `https://gellog.app/salon/${encodeURIComponent(placeId)}`;
    const title = `${salonName} on Gellog`;
    const text = `Check out ${salonName} on Gellog — ${visitCount} visit${visitCount !== 1 ? "s" : ""} logged!`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        copyToClipboard(url);
        showToast("Link copied to clipboard!");
      }
    } catch {
      // user cancelled
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        style={{ color: "var(--color-text-secondary)" }}
        aria-label="Share salon page"
      >
        <Icon name="GellogShare" size={14} strokeWidth={2} />
        Share
      </button>
      {toast && (
        <Toast key={toast.id} message={toast.message} onDismiss={dismissToast} />
      )}
    </>
  );
}
