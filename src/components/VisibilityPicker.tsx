"use client";

export type Visibility = "public" | "friends" | "private";

const OPTIONS: { value: Visibility; label: string; icon: string }[] = [
  { value: "public", label: "Public", icon: "🌍" },
  { value: "friends", label: "Friends", icon: "👥" },
  { value: "private", label: "Private", icon: "🔒" },
];

export function VisibilityPicker({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  return (
    <div className="flex rounded-2xl bg-background-secondary p-0.5 dark:bg-background-tertiary">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium transition ${
            value === opt.value
              ? "bg-surface-elevated text-text-primary shadow-sm dark:bg-surface-elevated dark:text-text-primary"
              : "text-text-secondary hover:text-text-primary dark:text-text-tertiary dark:hover:text-text-secondary"
          }`}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
