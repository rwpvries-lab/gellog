"use client";

import { useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { Toast, useToast } from "@/src/components/Toast";

const REASONS = [
  "Inappropriate content",
  "Spam",
  "Fake or misleading",
  "Other",
] as const;

/**
 * Report ("flag") control for an ice cream log (Apple Guideline 1.2). Renders a
 * three-dot menu button that opens a bottom sheet of reasons; selecting one writes
 * a `content_reports` row (RLS: insert-own) and notifies support via
 * `/api/report-content`. Manual review is fine for v1 — the log is not hidden.
 */
export function ReportLogButton({
  logId,
  currentUserId,
  className,
}: {
  logId: string;
  currentUserId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  async function submitReport(reason: string) {
    if (submitting || !currentUserId) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: currentUserId,
      reported_log_id: logId,
      reason,
    });
    setSubmitting(false);
    setOpen(false);

    if (error) {
      showToast("Couldn't submit report. Please try again.");
      return;
    }

    showToast("Report submitted. Thank you.");
    void fetch("/api/report-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "report", reportedLogId: logId, reason }),
    }).catch(() => {});
  }

  // Only signed-in users (other than the author) can report; caller decides placement.
  if (!currentUserId) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ??
          "flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-tertiary)] transition hover:bg-[color:var(--surface-elevated-alt)] hover:text-[color:var(--text-primary)]"
        }
        aria-label="Report log"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-[color:var(--color-backdrop)]" />
          <div
            className="relative w-full rounded-t-3xl bg-[color:var(--surface-elevated)] p-6 shadow-2xl ring-1 ring-[color:var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                Report this log
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--surface-elevated-alt)] text-xs text-[color:var(--text-secondary)] transition hover:brightness-95 dark:hover:brightness-110"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitReport(reason)}
                  className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-elevated-alt)] px-4 py-3 text-left text-sm font-medium text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)] transition hover:brightness-95 disabled:opacity-60 dark:hover:brightness-110"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <Toast key={toast.id} message={toast.message} onDismiss={dismissToast} />
      ) : null}
    </>
  );
}
