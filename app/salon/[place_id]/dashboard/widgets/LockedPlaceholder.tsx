import { UpgradeButton } from "./UpgradeButton";
import type { PlaceholderVariant, Tier } from "./types";

const TIER_LABEL: Record<Exclude<Tier, "free">, string> = {
  basic: "Salon Basic — €9/mo",
  pro: "Salon Pro — €29/mo",
};

function PlaceholderShape({ variant }: { variant: PlaceholderVariant }) {
  if (variant === "chart") {
    return (
      <div className="flex h-28 items-end gap-2">
        {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-lg bg-zinc-200 dark:bg-zinc-700"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    );
  }
  if (variant === "table") {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-24 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === "grid") {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-md bg-zinc-200 dark:bg-zinc-700"
            style={{ opacity: 0.35 + (i % 4) * 0.15 }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800">
          <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>
      ))}
    </div>
  );
}

export function LockedPlaceholder({
  title,
  requiredTier,
  variant,
  placeId,
}: {
  title: string;
  requiredTier: Exclude<Tier, "free">;
  variant: PlaceholderVariant;
  placeId: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      <div className="relative select-none overflow-hidden rounded-2xl">
        <div className="pointer-events-none blur-sm" aria-hidden>
          <PlaceholderShape variant={variant} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 px-4 text-center dark:bg-zinc-900/70">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Unlock with {TIER_LABEL[requiredTier]}
          </p>
          <UpgradeButton placeId={placeId} tier={requiredTier} label={`Upgrade to ${requiredTier === "pro" ? "Pro" : "Basic"}`} />
        </div>
      </div>
    </div>
  );
}
