"use client";

type Props = {
  isCustomizing: boolean;
  saving: boolean;
  onToggle: () => void;
  onReset: () => void;
};

export function CustomizeBar({ isCustomizing, saving, onToggle, onReset }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {isCustomizing
          ? "Show, hide, and reorder widgets. Changes save automatically."
          : saving
            ? "Saving…"
            : null}
      </p>
      <div className="ml-auto flex items-center gap-2">
        {isCustomizing && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Reset to default
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            isCustomizing
              ? "bg-[color:var(--brand-primary)] text-white hover:bg-[color:var(--brand-primary-hover)]"
              : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {isCustomizing ? "Done" : "Customize"}
        </button>
      </div>
    </div>
  );
}
