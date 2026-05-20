"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DAYS,
  defaultWeekHours,
  type DayKey,
  type WeekHours,
} from "@/src/lib/opening-hours";

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type HoursPayload = {
  source: "google" | "override" | null;
  hours: WeekHours | null;
  googleHours: WeekHours | null;
  hasOverride: boolean;
};

type Props = { placeId: string };

export function OpeningHoursEditor({ placeId }: Props) {
  const [tab, setTab] = useState<"google" | "override">("google");
  const [googleHours, setGoogleHours] = useState<WeekHours | null>(null);
  const [draft, setDraft] = useState<WeekHours>(() => defaultWeekHours());
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salon/${encodeURIComponent(placeId)}/hours`);
      if (!res.ok) return;
      const data = (await res.json()) as HoursPayload;
      setGoogleHours(data.googleHours);
      setHasOverride(data.hasOverride);
      if (data.hasOverride && data.hours) {
        setDraft(data.hours);
        setTab("override");
      } else if (data.googleHours) {
        setDraft({ ...data.googleHours });
      }
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setDayField<K extends keyof WeekHours[DayKey]>(
    day: DayKey,
    field: K,
    value: WeekHours[DayKey][K],
  ) {
    setDraft((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function toggleClosed(day: DayKey) {
    setDraft((prev) => {
      const current = prev[day];
      if (current.closed) {
        const google = googleHours?.[day];
        return {
          ...prev,
          [day]:
            google && !google.closed
              ? { closed: false, open: google.open, close: google.close }
              : { closed: false, open: "10:00", close: "18:00" },
        };
      }
      return { ...prev, [day]: { closed: true } };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/salon/${encodeURIComponent(placeId)}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to save");
        return;
      }
      setHasOverride(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleClearOverride() {
    setClearing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/salon/${encodeURIComponent(placeId)}/hours/override`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setError("Failed to clear override");
        return;
      }
      setHasOverride(false);
      if (googleHours) {
        setDraft({ ...googleHours });
      } else {
        setDraft(defaultWeekHours());
      }
    } finally {
      setClearing(false);
    }
  }

  return (
    <div
      id="opening-hours"
      className="scroll-mt-28 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
    >
      <h2 className="mb-4 font-serif text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Opening hours
      </h2>

      {/* Tab bar */}
      <div className="mb-4 flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
        {(["google", "override"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              tab === t
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-700 dark:text-zinc-50 dark:ring-zinc-600"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t === "google" ? "From Google" : "Custom override"}
            {t === "override" && hasOverride && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--brand-primary)] align-middle" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {DAYS.map((d) => (
            <div
              key={d}
              className="h-9 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : tab === "google" ? (
        <GoogleTab googleHours={googleHours} />
      ) : (
        <OverrideTab
          draft={draft}
          hasOverride={hasOverride}
          saving={saving}
          clearing={clearing}
          saved={saved}
          error={error}
          toggleClosed={toggleClosed}
          setDayField={setDayField}
          onSave={() => void handleSave()}
          onClearOverride={() => void handleClearOverride()}
        />
      )}
    </div>
  );
}

function GoogleTab({ googleHours }: { googleHours: WeekHours | null }) {
  if (!googleHours) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        No hours found on Google for this salon.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {DAYS.map((day) => {
        const h = googleHours[day];
        return (
          <div key={day} className="flex justify-between gap-4 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{DAY_LABELS[day]}</span>
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
              {h.closed ? "Closed" : `${h.open} – ${h.close}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type OverrideTabProps = {
  draft: WeekHours;
  hasOverride: boolean;
  saving: boolean;
  clearing: boolean;
  saved: boolean;
  error: string | null;
  toggleClosed: (day: DayKey) => void;
  setDayField: <K extends keyof WeekHours[DayKey]>(
    day: DayKey,
    field: K,
    value: WeekHours[DayKey][K],
  ) => void;
  onSave: () => void;
  onClearOverride: () => void;
};

function OverrideTab({
  draft,
  hasOverride,
  saving,
  clearing,
  saved,
  error,
  toggleClosed,
  setDayField,
  onSave,
  onClearOverride,
}: OverrideTabProps) {
  return (
    <div className="space-y-3">
      {DAYS.map((day) => {
        const h = draft[day];
        return (
          <div key={day} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm text-zinc-700 dark:text-zinc-300">
              {DAY_LABELS[day]}
            </span>
            <label className="relative flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!h.closed}
                onChange={() => toggleClosed(day)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-zinc-200 transition peer-checked:bg-[color:var(--brand-primary)] dark:bg-zinc-700 peer-checked:dark:bg-[color:var(--brand-primary)]" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </label>
            {h.closed ? (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Closed</span>
            ) : (
              <div className="flex items-center gap-1.5 text-sm">
                <input
                  type="time"
                  value={h.open}
                  onChange={(e) =>
                    setDayField(day, "open" as keyof WeekHours[DayKey], e.target.value as never)
                  }
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs tabular-nums text-zinc-900 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <span className="text-zinc-400">–</span>
                <input
                  type="time"
                  value={h.close}
                  onChange={(e) =>
                    setDayField(day, "close" as keyof WeekHours[DayKey], e.target.value as never)
                  }
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs tabular-nums text-zinc-900 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <p className="text-xs text-[color:var(--state-error)]">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-[color:var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[color:var(--brand-primary-hover)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save override"}
        </button>

        {hasOverride && (
          <button
            type="button"
            onClick={onClearOverride}
            disabled={clearing}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {clearing ? "Clearing…" : "Use Google hours"}
          </button>
        )}

        {saved && (
          <span className="text-xs text-[color:var(--brand-primary)]">
            Saved ✓
          </span>
        )}
      </div>
    </div>
  );
}
