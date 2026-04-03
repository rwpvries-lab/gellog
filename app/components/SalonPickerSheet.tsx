"use client";

import type { ClaimedSalon } from "@/src/hooks/useClaimedSalons";

type Props = {
  open: boolean;
  salons: ClaimedSalon[];
  onClose: () => void;
  onPick: (placeId: string) => void;
  title?: string;
};

export function SalonPickerSheet({
  open,
  salons,
  onClose,
  onPick,
  title = "Choose a salon",
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="salon-picker-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(70vh,24rem)] w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2
            id="salon-picker-title"
            className="text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {title}
          </h2>
        </div>
        <ul className="max-h-[min(50vh,20rem)] overflow-y-auto py-1">
          {salons.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onClick={() => onPick(s.place_id)}
                className="flex w-full items-center px-4 py-3.5 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
              >
                {s.salon_name}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
