"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { Gelato } from "@/src/components/Gelato/Gelato";
import { PlaceholderScoop } from "@/src/components/Gelato/PlaceholderScoop";
import {
  BASE_TOKENS,
  DRIZZLE_TOKENS,
  CRUMBLE_TOKENS,
  type BaseToken,
  type DrizzleToken,
  type CrumbleToken,
  type GelatoTokens,
} from "@/src/lib/gelato-tokens";
import { userFacingSaveError } from "@/src/lib/userFacingError";
import type { VitrineFlavour } from "./FlavourBoard";

// ── Colour utilities ──────────────────────────────────────────────

const HEX_RE = /^#[0-9a-f]{6}$/i;
function isValidHex(s: string): boolean {
  return HEX_RE.test(s);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function colorDistance(a: string, b: string): number {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return Infinity;
  return (ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2 + (ra[2] - rb[2]) ** 2;
}

// The cream surface the vitrine scoops sit on.
const CREAM_SURFACE = "#FBF5E8";
// Below this WCAG contrast ratio against cream, a base reads as "faint".
const FAINT_CONTRAST_RATIO = 1.3;

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** True when a base colour is too light to read against the cream vitrine. */
function isFaintOnCream(hex: string): boolean {
  return isValidHex(hex) && contrastRatio(hex, CREAM_SURFACE) < FAINT_CONTRAST_RATIO;
}

function nearestBaseToken(hex: string): BaseToken {
  let best: BaseToken = "cream";
  let bestDist = Infinity;
  for (const [key, t] of Object.entries(BASE_TOKENS)) {
    const d = colorDistance(hex, t.hex);
    if (d < bestDist) {
      bestDist = d;
      best = key as BaseToken;
    }
  }
  return best;
}

function nearestDrizzleToken(hex: string): DrizzleToken {
  let best: DrizzleToken = "none";
  let bestDist = Infinity;
  for (const [key, t] of Object.entries(DRIZZLE_TOKENS)) {
    if (key === "none") continue;
    const d = colorDistance(hex, t.stroke);
    if (d < bestDist) {
      bestDist = d;
      best = key as DrizzleToken;
    }
  }
  return best;
}

function nearestCrumbleToken(hex: string): CrumbleToken {
  let best: CrumbleToken = "none";
  let bestDist = Infinity;
  for (const [key, t] of Object.entries(CRUMBLE_TOKENS)) {
    if (key === "none" || !("fill" in t) || t.fill === "mixed") continue;
    const d = colorDistance(hex, t.fill as string);
    if (d < bestDist) {
      bestDist = d;
      best = key as CrumbleToken;
    }
  }
  return best;
}

// ── Swatch metadata ───────────────────────────────────────────────

// 6 extra swatches added to all three pickers (UI-only, no DB changes)
const EXTRA_COLOUR_SWATCHES: { color: string; name: string }[] = [
  { color: "#C0392B", name: "Deep Red" },
  { color: "#FAF6EE", name: "Off-white" },
  { color: "#E8865A", name: "Coral" },
  { color: "#B39DDB", name: "Lavender" },
  { color: "#4DB6AC", name: "Teal" },
  { color: "#C68642", name: "Caramel" },
];

const BASE_SWATCHES = Object.entries(BASE_TOKENS).map(([key, t]) => ({
  key: key as BaseToken,
  color: t.hex,
  name: t.name,
}));

const DRIZZLE_SWATCHES = Object.entries(DRIZZLE_TOKENS).map(([key, t]) => ({
  key: key as DrizzleToken,
  color: key === "none" ? null : t.stroke,
  name:
    key === "none"
      ? "None"
      : key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

const CRUMBLE_SWATCHES = Object.entries(CRUMBLE_TOKENS).map(([key, t]) => ({
  key: key as CrumbleToken,
  color:
    key === "none"
      ? null
      : "fill" in t && t.fill === "mixed"
      ? "rainbow"
      : "fill" in t
      ? (t.fill as string)
      : null,
  name:
    key === "none"
      ? "None"
      : key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

// ── Swatch circle ─────────────────────────────────────────────────

function Swatch({
  color,
  name,
  selected,
  onClick,
}: {
  color: string | null;
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  const isNone = color === null;
  const isRainbow = color === "rainbow";

  return (
    <button
      type="button"
      title={name}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={name}
      className={`relative h-8 w-8 flex-shrink-0 rounded-full transition-all focus:outline-none ${
        selected
          ? "ring-2 ring-[#A85530] ring-offset-2 ring-offset-[#FBF5E8]"
          : "ring-1 ring-black/10 hover:scale-110 hover:ring-black/20"
      }`}
      style={{
        background: isRainbow
          ? "conic-gradient(from 0deg, #F9A8D4, #F2C14E, #C7EBD1, #A7C957, #7E57C2, #F9A8D4)"
          : isNone
          ? "transparent"
          : color,
        border: isNone ? "2px dashed #D1D5DB" : undefined,
      }}
    >
      {isNone && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-400"
          aria-hidden
        >
          ∅
        </span>
      )}
    </button>
  );
}

// ── Token layer picker ────────────────────────────────────────────

type ExtraSwatch = { color: string; name: string; selected: boolean; onSelect: () => void };

function TokenLayerPicker<K extends string>({
  label,
  hint,
  swatches,
  value,
  onChange,
  extraSwatches,
}: {
  label: string;
  hint: string;
  swatches: { key: K; color: string | null; name: string }[];
  value: K;
  onChange: (key: K) => void;
  extraSwatches?: ExtraSwatch[];
}) {
  return (
    <div>
      <p className="mb-0.5 text-sm font-semibold text-zinc-800">{label}</p>
      <p className="mb-2.5 text-xs text-zinc-400">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {swatches.map((s) => (
          <Swatch
            key={s.key}
            color={s.color}
            name={s.name}
            selected={value === s.key}
            onClick={() => onChange(s.key)}
          />
        ))}
        {extraSwatches?.map((s) => (
          <Swatch
            key={s.color}
            color={s.color}
            name={s.name}
            selected={s.selected}
            onClick={s.onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ── Custom hex row ────────────────────────────────────────────────

function HexInput({
  value,
  dotColor,
  label,
  onChange,
  error,
}: {
  value: string;
  dotColor: string;
  label: string;
  onChange: (hex: string) => void;
  error?: string;
}) {
  const showDot = isValidHex(dotColor);
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <div
          className="h-5 w-5 flex-shrink-0 rounded-full ring-1 ring-black/10"
          style={
            showDot
              ? { backgroundColor: dotColor }
              : { border: "2px dashed #D1D5DB" }
          }
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder="#RRGGBB"
          aria-label={label}
          aria-invalid={!!error}
          className={`w-24 rounded-lg border bg-white px-2.5 py-1 font-mono text-xs text-zinc-700 focus:outline-none focus:ring-1 ${
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
              : "border-zinc-200 focus:border-[#A85530] focus:ring-[#A85530]/20"
          }`}
        />
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Live preview strip ────────────────────────────────────────────

function PreviewStrip({
  tokens,
  name,
  compact,
}: {
  tokens: GelatoTokens;
  name: string;
  compact: boolean;
}) {
  const size = compact ? 64 : 88;
  return (
    <div
      className={`flex ${compact ? "flex-row items-end gap-5" : "flex-col items-center gap-6"}`}
    >
      {(["vitrine", "cup", "cone"] as const).map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-1">
          <Gelato variant={variant} tokens={tokens} size={size} />
          <span className="text-[10px] capitalize text-zinc-400">{variant}</span>
        </div>
      ))}
      {!compact && name.trim() && (
        <p className="max-w-[120px] truncate text-center text-xs font-medium text-zinc-500">
          {name.trim()}
        </p>
      )}
    </div>
  );
}

// Catches render failures from the <Gelato> preview so the modal stays usable.
class PreviewErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ── Preview area with empty / loading / error states ───────────────

function PreviewArea({
  tokens,
  name,
  compact,
  loading,
  empty,
}: {
  tokens: GelatoTokens;
  name: string;
  compact: boolean;
  loading: boolean;
  empty: boolean;
}) {
  const placeholderSize = compact ? 56 : 72;

  if (empty) {
    return (
      <div
        className={`flex items-center text-center ${
          compact ? "flex-row gap-3" : "flex-col gap-3"
        }`}
      >
        <PlaceholderScoop size={placeholderSize} className="opacity-40" />
        <p className="max-w-[140px] text-xs text-zinc-400">
          Name your flavour and pick colours to see a live preview.
        </p>
      </div>
    );
  }

  return (
    <PreviewErrorBoundary
      key={`${tokens.base}-${tokens.drizzle}-${tokens.crumble}`}
      fallback={
        <div className="flex flex-col items-center gap-2 text-center">
          <PlaceholderScoop size={placeholderSize} className="opacity-40" />
          <p className="max-w-[140px] text-xs text-red-500">
            Couldn&rsquo;t render this preview.
          </p>
        </div>
      }
    >
      <div className="relative">
        <PreviewStrip tokens={tokens} name={name} compact={compact} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#FBF5E8]/55 backdrop-blur-[1px]">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#A85530] border-t-transparent" />
          </div>
        )}
      </div>
    </PreviewErrorBoundary>
  );
}

// ── Main modal ────────────────────────────────────────────────────

type SuggestionSource = "community" | "catalogue" | "compound" | null;

export type FlavourBuilderModalProps = {
  placeId: string;
  existingFlavour?: VitrineFlavour | null;
  onSave: (flavour: VitrineFlavour) => void;
  onClose: () => void;
};

function drizzleTokenToHex(token: DrizzleToken): string {
  if (token === "none") return "";
  return DRIZZLE_TOKENS[token].stroke;
}

function crumbleTokenToHex(token: CrumbleToken): string {
  if (token === "none") return "";
  const t = CRUMBLE_TOKENS[token];
  if (!("fill" in t) || t.fill === "mixed") return "";
  return t.fill as string;
}

export function FlavourBuilderModal({
  placeId,
  existingFlavour,
  onSave,
  onClose,
}: FlavourBuilderModalProps) {
  const existing = existingFlavour;

  const safeBase = (
    existing?.base_token && existing.base_token in BASE_TOKENS
      ? existing.base_token
      : "cream"
  ) as BaseToken;

  const safeDrizzle = (
    existing?.drizzle_token && existing.drizzle_token in DRIZZLE_TOKENS
      ? existing.drizzle_token
      : "none"
  ) as DrizzleToken;

  const safeCrumble = (
    existing?.crumble_token && existing.crumble_token in CRUMBLE_TOKENS
      ? existing.crumble_token
      : "none"
  ) as CrumbleToken;

  const [name, setName] = useState(existing?.name ?? "");
  const [baseToken, setBaseToken] = useState<BaseToken>(safeBase);
  const [drizzleToken, setDrizzleToken] = useState<DrizzleToken>(safeDrizzle);
  const [crumbleToken, setCrumbleToken] = useState<CrumbleToken>(safeCrumble);

  // Custom hex states — drive swatch selection via nearest-token matching
  const [customColour, setCustomColour] = useState(
    existing?.colour ?? BASE_TOKENS["cream"].hex,
  );
  const [drizzleHex, setDrizzleHex] = useState(() =>
    drizzleTokenToHex(safeDrizzle),
  );
  const [crumbleHex, setCrumbleHex] = useState(() =>
    crumbleTokenToHex(safeCrumble),
  );

  const [isExclusive, setIsExclusive] = useState(existing?.is_exclusive ?? false);
  const [isBrandNew, setIsBrandNew] = useState(existing?.is_brand_new ?? false);
  const [isVegan, setIsVegan] = useState(existing?.is_vegan ?? false);

  const [suggestionSource, setSuggestionSource] = useState<SuggestionSource>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);

  // ── Validation ─────────────────────────────────────────────────────
  // A blank drizzle/crumble hex is valid — it means the "None" layer.
  const nameValid = name.trim().length > 0;
  const baseHexValid = isValidHex(customColour);
  const drizzleHexValid = drizzleHex.trim() === "" || isValidHex(drizzleHex);
  const crumbleHexValid = crumbleHex.trim() === "" || isValidHex(crumbleHex);
  const formValid = nameValid && baseHexValid && drizzleHexValid && crumbleHexValid;

  // Contrast guard — warn (don't block) when the base reads faint on cream.
  const baseHexForContrast = isValidHex(customColour)
    ? customColour
    : BASE_TOKENS[baseToken].hex;
  const baseFaint = isFaintOnCream(baseHexForContrast);

  const lastResolvedRef = useRef("");
  const supabase = createClient();

  const tokens: GelatoTokens = { base: baseToken, drizzle: drizzleToken, crumble: crumbleToken };

  // Empty state: a fresh "Add" before any name/colour choice. Editing or any
  // edit immediately shows the live scoop.
  const previewEmpty =
    !existing &&
    !name.trim() &&
    baseToken === "cream" &&
    drizzleToken === "none" &&
    crumbleToken === "none";

  // Auto-resolve for legacy edit (no stored tokens)
  useEffect(() => {
    if (existing && !existing.base_token) {
      void resolveFromName(existing.name, { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function resolveFromName(
    inputName: string,
    { silent = false, force = false }: { silent?: boolean; force?: boolean } = {},
  ) {
    const trimmed = inputName.trim();
    if (!trimmed) return;
    // Skip the auto-resolve dedupe when the owner explicitly asks for a reset.
    if (!force && trimmed === lastResolvedRef.current) return;
    if (!silent) {
      setResolving(true);
      setResolveError(null);
    }

    let data: unknown;
    try {
      const res = await supabase.rpc("resolve_flavour_tokens", { input: trimmed });
      if (res.error) throw res.error;
      data = res.data;
    } catch {
      if (!silent) {
        setResolving(false);
        setResolveError("Couldn't fetch a suggestion. Please try again.");
      }
      return;
    }

    if (!silent) setResolving(false);

    if (!Array.isArray(data) || data.length === 0) {
      if (force) setResolveError("No suggestion found for that name.");
      return;
    }
    const row = data[0] as {
      flavour_id: string | null;
      base_token: string;
      drizzle_token: string | null;
      crumble_token: string | null;
      source: string | null;
    };

    // On an explicit reset we accept a cream suggestion too; auto-resolve keeps
    // the owner's existing colours rather than clobbering with a bland default.
    const usable =
      row.base_token &&
      row.base_token in BASE_TOKENS &&
      (force || row.base_token !== "cream");

    if (usable) {
      const bt = row.base_token as BaseToken;
      const dt = (row.drizzle_token ?? "none") as DrizzleToken;
      const ct = (row.crumble_token ?? "none") as CrumbleToken;
      setBaseToken(bt);
      setDrizzleToken(dt);
      setCrumbleToken(ct);
      setCustomColour(BASE_TOKENS[bt].hex);
      setDrizzleHex(drizzleTokenToHex(dt));
      setCrumbleHex(crumbleTokenToHex(ct));
      setSuggestionSource(
        row.source === "owner_defined"
          ? "community"
          : row.flavour_id
            ? "catalogue"
            : "compound",
      );
      lastResolvedRef.current = trimmed;
    } else if (force) {
      setResolveError("No suggestion found for that name.");
    }
  }

  // ── Layer change handlers ────────────────────────────────────────

  function handleBaseChange(token: BaseToken) {
    setBaseToken(token);
    setCustomColour(BASE_TOKENS[token].hex);
    setSuggestionSource(null);
  }

  function handleBaseHexInput(hex: string) {
    setCustomColour(hex);
    if (isValidHex(hex)) {
      setBaseToken(nearestBaseToken(hex));
      setSuggestionSource(null);
    }
  }

  function handleDrizzleChange(token: DrizzleToken) {
    setDrizzleToken(token);
    setDrizzleHex(drizzleTokenToHex(token));
    setSuggestionSource(null);
  }

  function handleDrizzleHexInput(hex: string) {
    setDrizzleHex(hex);
    if (isValidHex(hex)) {
      setDrizzleToken(nearestDrizzleToken(hex));
      setSuggestionSource(null);
    }
  }

  function handleCrumbleChange(token: CrumbleToken) {
    setCrumbleToken(token);
    setCrumbleHex(crumbleTokenToHex(token));
    setSuggestionSource(null);
  }

  function handleCrumbleHexInput(hex: string) {
    setCrumbleHex(hex);
    if (isValidHex(hex)) {
      setCrumbleToken(nearestCrumbleToken(hex));
      setSuggestionSource(null);
    }
  }

  // ── Extra swatch builders ────────────────────────────────────────

  const baseExtras: ExtraSwatch[] = EXTRA_COLOUR_SWATCHES.map((s) => ({
    color: s.color,
    name: s.name,
    selected: customColour === s.color,
    onSelect: () => handleBaseHexInput(s.color),
  }));

  const drizzleExtras: ExtraSwatch[] = EXTRA_COLOUR_SWATCHES.map((s) => ({
    color: s.color,
    name: s.name,
    selected: drizzleHex === s.color,
    onSelect: () => handleDrizzleHexInput(s.color),
  }));

  const crumbleExtras: ExtraSwatch[] = EXTRA_COLOUR_SWATCHES.map((s) => ({
    color: s.color,
    name: s.name,
    selected: crumbleHex === s.color,
    onSelect: () => handleCrumbleHexInput(s.color),
  }));

  // ── Save ─────────────────────────────────────────────────────────

  async function handleSave() {
    setAttemptedSave(true);
    if (!formValid) return;
    const trimmed = name.trim();
    setSaving(true);
    setError(null);

    const payload = {
      salon_place_id: placeId,
      name: trimmed,
      colour: customColour,
      base_token: baseToken,
      drizzle_token: drizzleToken,
      crumble_token: crumbleToken,
      is_exclusive: isExclusive,
      is_brand_new: isBrandNew,
      is_vegan: isVegan,
    };

    const upsert = existing
      ? supabase.from("vitrine_flavours").update(payload).eq("id", existing.id)
      : supabase.from("vitrine_flavours").insert({
          ...payload,
          is_visible: true,
          display_started_at: new Date().toISOString(),
        });

    const { data, error: saveError } = await upsert
      .select()
      .maybeSingle<VitrineFlavour>();

    if (saveError) {
      setError(userFacingSaveError(saveError, "Could not save. Please try again."));
    } else if (data) {
      // Smart-save: promote these tokens to the global catalogue keyed by name, so the
      // next owner who adds the same flavour gets them pre-filled. The conflict rule
      // lives in the RPC; a failure here must not block the salon-row save.
      void supabase.rpc("upsert_owner_flavour_catalogue", {
        p_name: trimmed,
        p_base_token: baseToken,
        p_drizzle_token: drizzleToken,
        p_crumble_token: crumbleToken,
      });
      onSave(data);
    } else {
      setError("Could not save. Please refresh and try again.");
    }
    setSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative my-auto w-full max-w-3xl rounded-3xl bg-[#FBF5E8] shadow-2xl ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/70 px-6 py-4">
          <h2 className="font-serif text-xl font-bold text-zinc-900">
            {existing ? "Edit Flavour" : "Add Flavour"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200/80 hover:text-zinc-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row">
          {/* Preview panel — top on mobile, right column on desktop */}
          <div className="flex items-center justify-center gap-6 border-b border-zinc-200/70 bg-white/40 px-6 py-5 lg:order-last lg:w-64 lg:flex-col lg:items-center lg:justify-start lg:rounded-br-3xl lg:border-b-0 lg:border-l lg:border-zinc-200/70 lg:px-5 lg:py-8">
            <p className="hidden font-serif text-sm font-semibold text-zinc-500 lg:block">
              Preview
            </p>
            <div className="lg:hidden">
              <PreviewArea
                tokens={tokens}
                name={name}
                compact
                loading={resolving}
                empty={previewEmpty}
              />
            </div>
            <div className="hidden lg:block">
              <PreviewArea
                tokens={tokens}
                name={name}
                compact={false}
                loading={resolving}
                empty={previewEmpty}
              />
            </div>
          </div>

          {/* Form panel */}
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 lg:max-h-[72vh]">
            {/* Name */}
            <div>
              <label
                htmlFor="fb-name"
                className="mb-1.5 block text-sm font-semibold text-zinc-800"
              >
                Flavour name
              </label>
              <div className="relative">
                <input
                  id="fb-name"
                  type="text"
                  value={name}
                  autoFocus={!existing}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSuggestionSource(null);
                  }}
                  onBlur={() => void resolveFromName(name)}
                  placeholder="e.g. Mango Yogurt"
                  aria-invalid={attemptedSave && !nameValid}
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 ${
                    attemptedSave && !nameValid
                      ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      : "border-zinc-200 focus:border-[#A85530] focus:ring-[#A85530]/20"
                  }`}
                />
                {resolving && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#A85530] border-t-transparent" />
                  </span>
                )}
              </div>
              {attemptedSave && !nameValid && (
                <p className="mt-1.5 text-xs text-red-600">
                  Please enter a flavour name.
                </p>
              )}
              {suggestionSource && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#A85530]">
                  <span aria-hidden>✦</span>
                  {suggestionSource === "community"
                    ? "Suggested from community — adjust freely"
                    : suggestionSource === "catalogue"
                      ? "Matched from the gelato catalogue — adjust freely"
                      : "Parsed from compound name — adjust freely"}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                {resolveError ? (
                  <p className="text-xs text-amber-600">{resolveError}</p>
                ) : (
                  <span />
                )}
                {name.trim() && (
                  <button
                    type="button"
                    onClick={() => void resolveFromName(name, { force: true })}
                    disabled={resolving}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500 transition hover:border-[#A85530] hover:text-[#A85530] disabled:opacity-50"
                    title="Re-run the suggestion and restore the suggested colours"
                  >
                    <span aria-hidden>↺</span> Reset to suggested
                  </button>
                )}
              </div>
            </div>

            <div className="h-px bg-zinc-200/60" />

            {/* Base */}
            <TokenLayerPicker
              label="Base colour"
              hint="The main body of the scoop"
              swatches={BASE_SWATCHES}
              value={baseToken}
              onChange={handleBaseChange}
              extraSwatches={baseExtras}
            />
            <HexInput
              value={customColour}
              dotColor={customColour}
              label="Custom hex (affects sidebar dot)"
              onChange={handleBaseHexInput}
              error={
                attemptedSave && !baseHexValid
                  ? "Enter a valid colour like #A85530"
                  : undefined
              }
            />
            {baseFaint && baseHexValid && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <span aria-hidden>⚠</span> This may look faint in the vitrine.
              </p>
            )}

            <div className="h-px bg-zinc-200/60" />

            {/* Drizzle */}
            <TokenLayerPicker
              label="Drizzle"
              hint="Swirl on the scoop — ∅ to skip"
              swatches={DRIZZLE_SWATCHES}
              value={drizzleToken}
              onChange={handleDrizzleChange}
              extraSwatches={drizzleExtras}
            />
            <HexInput
              value={drizzleHex}
              dotColor={drizzleHex}
              label="Custom hex (selects nearest drizzle)"
              onChange={handleDrizzleHexInput}
              error={
                attemptedSave && !drizzleHexValid
                  ? "Enter a valid colour like #A85530, or clear it for none"
                  : undefined
              }
            />

            <div className="h-px bg-zinc-200/60" />

            {/* Crumble */}
            <TokenLayerPicker
              label="Crumble"
              hint="Chunks and inclusions — ∅ to skip"
              swatches={CRUMBLE_SWATCHES}
              value={crumbleToken}
              onChange={handleCrumbleChange}
              extraSwatches={crumbleExtras}
            />
            <HexInput
              value={crumbleHex}
              dotColor={crumbleHex}
              label="Custom hex (selects nearest crumble)"
              onChange={handleCrumbleHexInput}
              error={
                attemptedSave && !crumbleHexValid
                  ? "Enter a valid colour like #A85530, or clear it for none"
                  : undefined
              }
            />

            <div className="h-px bg-zinc-200/60" />

            {/* Modifier labels */}
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-800">Labels</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      key: "exclusive",
                      label: "Exclusive",
                      title: "Only at this salon",
                      value: isExclusive,
                      toggle: () => setIsExclusive((v) => !v),
                    },
                    {
                      key: "brand-new",
                      label: "Brand New",
                      title: "Recently added to your board",
                      value: isBrandNew,
                      toggle: () => setIsBrandNew((v) => !v),
                    },
                    {
                      key: "vegan",
                      label: "Vegan",
                      title: "Dairy-free / plant-based",
                      value: isVegan,
                      toggle: () => setIsVegan((v) => !v),
                    },
                  ] as const
                ).map(({ key, label, title, value, toggle }) => (
                  <button
                    key={key}
                    type="button"
                    title={title}
                    aria-pressed={value}
                    onClick={toggle}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                      value
                        ? "border-[#A85530] bg-[#A85530] text-[#FBF5E8]"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 rounded-b-3xl border-t border-zinc-200/70 bg-white/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            aria-disabled={attemptedSave && !formValid}
            className="inline-flex items-center gap-2 rounded-full bg-[#A85530] px-6 py-2.5 text-sm font-semibold text-[#FBF5E8] shadow-sm transition hover:brightness-110 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#A85530]/30 focus:ring-offset-2"
          >
            {saving && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#FBF5E8] border-t-transparent" />
            )}
            {saving ? "Saving…" : existing ? "Update Flavour" : "Add Flavour"}
          </button>
        </div>
      </div>
    </div>
  );
}
