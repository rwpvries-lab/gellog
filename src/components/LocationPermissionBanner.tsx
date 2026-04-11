"use client";

type LocationPermissionBannerProps = {
  message: string | null;
  onDismiss: () => void;
  /** Optional Tailwind overrides (e.g. map chrome uses zinc surfaces). */
  className?: string;
};

export function LocationPermissionBanner({
  message,
  onDismiss,
  className,
}: LocationPermissionBannerProps) {
  if (!message) return null;
  const surface =
    className ??
    "border-[color:var(--color-error-border)] bg-[color:var(--color-error-surface)] text-[color:var(--color-error)]";
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs ${surface}`}
    >
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
  );
}
