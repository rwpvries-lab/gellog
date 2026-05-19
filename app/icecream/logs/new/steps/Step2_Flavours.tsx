"use client";

import {
  searchCanonicalFlavours,
  type CanonicalFlavourPick,
} from "@/src/lib/canonical-flavour-search";
import { BASE_TOKENS } from "@/src/lib/gelato-tokens";
import { createClient } from "@/src/lib/supabase/client";
import { useFlavourTokens } from "@/src/lib/use-flavour-tokens";
import { Star, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LogFlowAction, LogFlowState } from "../logFlowReducer";

type VitrineResolvedPillRow = {
  vitrine_flavour_id: string;
  input_name: string;
  flavour_id: string | null;
  canonical_name_en: string | null;
  canonical_name_nl: string | null;
  legacy_colour: string | null;
};

function pillLabel(row: VitrineResolvedPillRow): string {
  return (
    row.canonical_name_nl?.trim() ||
    row.canonical_name_en?.trim() ||
    row.input_name.trim() ||
    "Flavour"
  );
}

function swatchColor(row: VitrineResolvedPillRow): string {
  const raw = row.legacy_colour?.trim();
  if (raw && /^#/.test(raw)) return raw;
  return "var(--brand-primary-muted)";
}

function FlavourNameInput({
  value,
  onChangeValue,
  onPickCanonical,
  disabled,
}: {
  value: string;
  onChangeValue: (v: string) => void;
  onPickCanonical: (pick: CanonicalFlavourPick) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CanonicalFlavourPick[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const t = value.trim();
    if (t.length < 2) {
      setItems([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void (async () => {
        const supabase = createClient();
        const picks = await searchCanonicalFlavours(supabase, t);
        setItems(picks);
        setOpen(picks.length > 0);
      })();
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <input
        type="text"
        disabled={disabled}
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        placeholder="Flavour name"
        autoComplete="off"
        className="w-full border-none bg-transparent font-serif text-[18px] font-medium text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-0 disabled:opacity-50"
      />
      {open && items.length > 0 ? (
        <ul
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-48 overflow-auto rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--background-secondary)] py-1 shadow-sm"
          role="listbox"
        >
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                className="flex w-full px-3 py-2 text-left font-sans text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--background-tertiary)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPickCanonical(item);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StarRow({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  const filled = value ?? 0;
  return (
    <div className="flex shrink-0 gap-0.5" role="group" aria-label="Flavour rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const isOn = n <= filled;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="rounded-sm p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{ '--tw-ring-color': 'var(--border-focus)' } as React.CSSProperties}
            aria-label={`${n} stars`}
          >
            <Star
              size={20}
              strokeWidth={1.75}
              style={{
                fill: isOn ? 'var(--brand-primary)' : 'transparent',
                color: 'var(--brand-primary)',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function SwatchDot({ colour }: { colour: string }) {
  return (
    <div
      className="h-10 w-10 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ background: colour }}
    />
  );
}

function ManualSwatch({ flavourName }: { flavourName: string }) {
  const { tokens } = useFlavourTokens(flavourName);
  const hex = BASE_TOKENS[tokens.base].hex;
  return <SwatchDot colour={hex} />;
}

export function Step2_Flavours({
  state,
  dispatch,
}: {
  state: LogFlowState;
  dispatch: React.Dispatch<LogFlowAction>;
}) {
  const [vitrineRows, setVitrineRows] = useState<VitrineResolvedPillRow[]>([]);
  const [vitrineLoading, setVitrineLoading] = useState(false);

  const salonPlaceId = state.step1.salon?.salon_place_id ?? null;

  useEffect(() => {
    if (!salonPlaceId) {
      setVitrineRows([]);
      setVitrineLoading(false);
      return;
    }

    let cancelled = false;
    setVitrineLoading(true);

    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("vitrine_flavours_resolved")
        .select(
          "vitrine_flavour_id, input_name, flavour_id, canonical_name_en, canonical_name_nl, legacy_colour",
        )
        .eq("salon_place_id", salonPlaceId)
        .eq("is_visible", true)
        .order("input_name");

      if (cancelled) return;
      setVitrineRows((data ?? []) as VitrineResolvedPillRow[]);
      setVitrineLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [salonPlaceId]);

  const atMax = state.step2.flavours.length >= 3;

  const isPillSelected = useCallback(
    (row: VitrineResolvedPillRow) =>
      state.step2.flavours.some(
        (f) =>
          (row.vitrine_flavour_id && f.vitrineFlavourId === row.vitrine_flavour_id) ||
          (row.flavour_id != null &&
            f.canonicalFlavourId != null &&
            f.canonicalFlavourId === row.flavour_id),
      ),
    [state.step2.flavours],
  );

  const handlePillClick = useCallback(
    (row: VitrineResolvedPillRow) => {
      if (atMax && !isPillSelected(row)) return;
      if (isPillSelected(row)) {
        const entry = state.step2.flavours.find(
          (f) =>
            (row.vitrine_flavour_id && f.vitrineFlavourId === row.vitrine_flavour_id) ||
            (row.flavour_id != null &&
              f.canonicalFlavourId != null &&
              f.canonicalFlavourId === row.flavour_id),
        );
        if (entry) dispatch({ type: "REMOVE_FLAVOUR", id: entry.id });
        return;
      }
      dispatch({
        type: "ADD_FLAVOUR",
        name: pillLabel(row),
        vitrineFlavourId: row.vitrine_flavour_id,
        canonicalFlavourId: row.flavour_id,
      });
    },
    [atMax, dispatch, isPillSelected, state.step2.flavours],
  );

  const showVitrineStrip =
    Boolean(salonPlaceId) && !vitrineLoading && vitrineRows.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {salonPlaceId && vitrineLoading ? (
        <p className="font-sans text-xs text-[color:var(--text-secondary)]">Loading vitrine…</p>
      ) : null}

      {showVitrineStrip ? (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
            From today&apos;s vitrine
          </p>
          <div
            className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              maskImage:
                "linear-gradient(to right, black 0%, black calc(100% - 28px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, black 0%, black calc(100% - 28px), transparent 100%)",
            }}
          >
            {vitrineRows.map((row) => {
              const selected = isPillSelected(row);
              const disabled = atMax && !selected;
              return (
                <button
                  key={row.vitrine_flavour_id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePillClick(row)}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 font-sans text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary-surface)] text-[color:var(--text-primary)]"
                      : "border-[color:var(--border-default)] bg-[color:var(--background-secondary)] text-[color:var(--text-primary)]"
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ background: swatchColor(row) }}
                    aria-hidden
                  />
                  <span className="max-w-[200px] truncate">{pillLabel(row)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {state.step2.flavours.map((flavour) => {
          const vitrineRow = vitrineRows.find(
            (r) =>
              (flavour.vitrineFlavourId && r.vitrine_flavour_id === flavour.vitrineFlavourId) ||
              (flavour.canonicalFlavourId != null &&
                r.flavour_id === flavour.canonicalFlavourId),
          );
          const swatchHex = vitrineRow ? swatchColor(vitrineRow) : null;

          return (
            <div
              key={flavour.id}
              className="flex items-center gap-4 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--background-secondary)] p-4"
            >
              {swatchHex ? (
                <SwatchDot colour={swatchHex} />
              ) : (
                <ManualSwatch flavourName={flavour.name} />
              )}
              <FlavourNameInput
                value={flavour.name}
                onChangeValue={(v) =>
                  dispatch({
                    type: "UPDATE_FLAVOUR",
                    id: flavour.id,
                    patch: { name: v },
                  })
                }
                onPickCanonical={(pick) =>
                  dispatch({
                    type: "UPDATE_FLAVOUR",
                    id: flavour.id,
                    patch: {
                      name: pick.label,
                      canonicalFlavourId: pick.id,
                      vitrineFlavourId: null,
                    },
                  })
                }
              />
              <StarRow
                value={flavour.rating}
                onChange={(n) =>
                  dispatch({
                    type: "UPDATE_FLAVOUR_RATING",
                    id: flavour.id,
                    rating: n,
                  })
                }
              />
              <button
                type="button"
                onClick={() => dispatch({ type: "REMOVE_FLAVOUR", id: flavour.id })}
                className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--text-tertiary)] transition hover:bg-[color:var(--background-tertiary)] hover:text-[color:var(--text-secondary)]"
                aria-label="Remove flavour"
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={atMax}
        onClick={() => {
          if (atMax) return;
          dispatch({ type: "ADD_FLAVOUR" });
        }}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color:var(--border-default)] bg-transparent font-sans text-base font-medium text-[color:var(--brand-primary)] transition hover:bg-[color:var(--brand-primary-surface)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden>+</span>
        Add another flavour
      </button>
    </div>
  );
}
