"use client";

type LocationPermissionBannerProps = {
  message: string | null;
  onDismiss: () => void;
  /** Optional Tailwind overrides (e.g. map chrome uses zinc surfaces). */
  className?: string;
  /** Smaller secondary line (e.g. iOS troubleshooting). */
  detail?: string | null;
};

export function LocationPermissionBanner({
  message,
  onDismiss,
  className,
  detail,
}: LocationPermissionBannerProps) {
  if (!message) return null;
  const surface =
    className ??
    "border-[color:var(--color-error-border)] bg-[color:var(--color-error-surface)] text-[color:var(--color-error)]";
  return (
    <div
      role="status"
      className={`rounded-xl border px-3 py-2.5 text-xs ${surface}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      {detail ? (
        <p className="mt-2 border-t border-current/10 pt-2 text-[11px] leading-snug opacity-90">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
