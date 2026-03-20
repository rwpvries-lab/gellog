"use client";

export type PhotoVisibility = "public" | "friends";

const OPTIONS: { value: PhotoVisibility; label: string; icon: string }[] = [
  { value: "public", label: "Everyone", icon: "🌍" },
  { value: "friends", label: "Followers only", icon: "👥" },
];

export function PhotoVisibilityPicker({
  value,
  onChange,
}: {
  value: PhotoVisibility;
  onChange: (v: PhotoVisibility) => void;
}) {
  return (
    <div className="flex rounded-2xl bg-zinc-100 p-0.5 dark:bg-zinc-800">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium transition ${
            value === opt.value
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
