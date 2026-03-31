"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  onDismiss: () => void;
  duration?: number;
};

export function Toast({ message, onDismiss, duration = 2500 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Start exit animation before calling onDismiss
    const exitTimer = setTimeout(() => setVisible(false), duration - 300);
    const doneTimer = setTimeout(() => onDismiss(), duration);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 96,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms ease, transform 220ms ease",
        zIndex: 60,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 999,
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-text-primary)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}

// ─── Clipboard helper ─────────────────────────────────────────────────────────

export function copyToClipboard(text: string): void {
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for non-secure contexts (HTTP over LAN/IP)
  const el = document.createElement("textarea");
  el.value = text;
  el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(el);
  el.focus();
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

type ToastState = { id: number; message: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(message: string) {
    setToast({ id: Date.now(), message });
  }

  function dismissToast() {
    setToast(null);
  }

  return { toast, showToast, dismissToast };
}
