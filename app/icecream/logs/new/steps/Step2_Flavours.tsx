"use client";

import { BASE_TOKENS } from "@/src/lib/gelato-tokens";
import type { BaseToken, DrizzleToken, CrumbleToken } from "@/src/lib/gelato-tokens";
import { createClient } from "@/src/lib/supabase/client";
import { useFlavourTokens } from "@/src/lib/use-flavour-tokens";
import { Vitrine } from "@/src/components/Gelato/variants/Vitrine";
import type { VitrineFlavour } from "@/src/components/Gelato/variants/Vitrine";
import { Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LogFlowAction, LogFlowState } from "../logFlowReducer";

// ── Vitrine data (extended with token fields for visual rendering) ─────────

type VitrineRow = {
  vitrine_flavour_id: string;
  input_name: string;
  flavour_id: string | null;
  canonical_name_en: string | null;
  canonical_name_nl: string | null;
  base_token: string | null;
  drizzle_token: string | null;
  crumble_token: string | null;
};

const FALLBACK_TOKENS = { base: "cream" as BaseToken, drizzle: "none" as DrizzleToken, crumble: "none" as CrumbleToken };

function rowDisplayName(row: VitrineRow): string {
  return (
    row.canonical_name_en?.trim() ||
    row.input_name.trim() ||
    row.canonical_name_nl?.trim() ||
    "Flavour"
  );
}

function rowToVitrineFlavour(row: VitrineRow): VitrineFlavour {
  return {
    id: row.vitrine_flavour_id,
    displayName: rowDisplayName(row),
    inputName: row.input_name,
    tokens: row.base_token
      ? {
          base: row.base_token as BaseToken,
          drizzle: (row.drizzle_token ?? "none") as DrizzleToken,
          crumble: (row.crumble_token ?? "none") as CrumbleToken,
        }
      : FALLBACK_TOKENS,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────

function FlavourNameInput({
  value,
  onChangeValue,
  disabled,
}: {
  value: string;
  onChangeValue: (v: string) => void;
  disabled?: boolean;
}) {
  // Plain text entry — no in-field suggestion dropdown. Canonical/colour
  // resolution (resolve_flavour) happens after entry, on save.
  return (
    <input
      type="text"
      disabled={disabled}
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      placeholder="Flavour name"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-form-type="other"
      className="w-full min-w-0 flex-1 border-none bg-transparent font-serif text-[18px] font-medium text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-0 disabled:opacity-50"
    />
  );
}

function StarRow({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
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
            style={{ "--tw-ring-color": "var(--border-focus)" } as React.CSSProperties}
            aria-label={`${n} stars`}
          >
            <Star
              size={20}
              strokeWidth={1.75}
              style={{
                fill: isOn ? "var(--brand-primary)" : "transparent",
                color: "var(--brand-primary)",
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

// ── Main component ────────────────────────────────────────────────────────

export function Step2_Flavours({
  state,
  dispatch,
}: {
  state: LogFlowState;
  dispatch: React.Dispatch<LogFlowAction>;
}) {
  const [vitrineRows, setVitrineRows] = useState<VitrineRow[]>([]);
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
          "vitrine_flavour_id, input_name, flavour_id, canonical_name_en, canonical_name_nl, base_token, drizzle_token, crumble_token",
        )
        .eq("salon_place_id", salonPlaceId)
        .eq("is_visible", true)
        .order("input_name");

      if (cancelled) return;
      setVitrineRows((data ?? []) as VitrineRow[]);
      setVitrineLoading(false);
    })();

    return () => { cancelled = true; };
  }, [salonPlaceId]);

  const atMax = state.step2.flavours.length >= 3;

  // IDs of flavours that were selected from the vitrine
  const selectedFlavourIds = state.step2.flavours
    .filter((f) => f.vitrineFlavourId != null)
    .map((f) => f.vitrineFlavourId!);

  const handleVitrineToggle = useCallback(
    (vitrineFlavourId: string) => {
      const existing = state.step2.flavours.find(
        (f) => f.vitrineFlavourId === vitrineFlavourId,
      );
      if (existing) {
        dispatch({ type: "REMOVE_FLAVOUR", id: existing.id });
        return;
      }
      if (atMax) return;
      const row = vitrineRows.find(
        (r) => r.vitrine_flavour_id === vitrineFlavourId,
      );
      if (!row) return;
      dispatch({
        type: "ADD_FLAVOUR",
        name: rowDisplayName(row),
        vitrineFlavourId: row.vitrine_flavour_id,
        canonicalFlavourId: row.flavour_id,
      });
    },
    [state.step2.flavours, atMax, dispatch, vitrineRows],
  );

  const vitrineFlavours: VitrineFlavour[] = vitrineRows.map(rowToVitrineFlavour);
  const hasVitrine = Boolean(salonPlaceId) && !vitrineLoading && vitrineRows.length > 0;
  const vitrineEmpty = Boolean(salonPlaceId) && !vitrineLoading && vitrineRows.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Vitrine section ── */}
      {salonPlaceId && vitrineLoading && (
        <p className="font-sans text-xs text-[color:var(--text-secondary)]">
          Loading vitrine…
        </p>
      )}

      {hasVitrine && (
        <div className="flex flex-col gap-3">
          <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
            From today&apos;s vitrine
          </p>
          <Vitrine
            flavours={vitrineFlavours}
            mode="select"
            selectedFlavourIds={selectedFlavourIds}
            onToggle={handleVitrineToggle}
            maxSelections={3}
          />
        </div>
      )}

      {vitrineEmpty && (
        <p className="rounded-2xl bg-[color:var(--background-secondary)] px-4 py-3 font-sans text-sm text-[color:var(--text-secondary)]">
          This salon hasn&apos;t published a vitrine yet — add flavours manually below.
        </p>
      )}

      {/* ── Selected flavours list ── */}
      {state.step2.flavours.length > 0 && (
        <div className="flex flex-col gap-3">
          {state.step2.flavours.map((flavour) => {
            const vitrineRow = vitrineRows.find(
              (r) =>
                (flavour.vitrineFlavourId &&
                  r.vitrine_flavour_id === flavour.vitrineFlavourId) ||
                (flavour.canonicalFlavourId != null &&
                  r.flavour_id === flavour.canonicalFlavourId),
            );
            const swatchHex =
              vitrineRow?.base_token
                ? (BASE_TOKENS[vitrineRow.base_token as BaseToken]?.hex ?? null)
                : null;

            return (
              <div
                key={flavour.id}
                className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--background-secondary)] p-4"
              >
                <div className="flex items-center gap-4">
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
              </div>
            );
          })}
        </div>
      )}

      {/* ── Manual add ── */}
      {hasVitrine ? (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
            Not on the vitrine?
          </p>
          <button
            type="button"
            disabled={atMax}
            onClick={() => { if (!atMax) dispatch({ type: "ADD_FLAVOUR" }); }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--border-default)] bg-transparent font-sans text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--background-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden>+</span>
            Add a flavour manually
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={atMax}
          onClick={() => { if (!atMax) dispatch({ type: "ADD_FLAVOUR" }); }}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color:var(--border-default)] bg-transparent font-sans text-base font-medium text-[color:var(--brand-primary)] transition hover:bg-[color:var(--brand-primary-surface)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden>+</span>
          Add another flavour
        </button>
      )}
    </div>
  );
}
