"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  hidden: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHidden: () => void;
  children: ReactNode;
};

/** Wraps a widget with reorder/hide controls while in Customize mode. */
export function WidgetFrame({ title, hidden, isFirst, isLast, onMoveUp, onMoveDown, onToggleHidden, children }: Props) {
  return (
    <div className={hidden ? "opacity-40" : ""}>
      <div className="mb-1.5 flex items-center justify-between gap-2 rounded-xl bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
        <span className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-300">{title}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move up"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move down"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onToggleHidden}
            aria-label={hidden ? "Show widget" : "Hide widget"}
            aria-pressed={!hidden}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
              hidden
                ? "text-zinc-400 hover:bg-zinc-200 dark:text-zinc-500 dark:hover:bg-zinc-700"
                : "text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-surface)]"
            }`}
          >
            {hidden ? "○" : "●"}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
