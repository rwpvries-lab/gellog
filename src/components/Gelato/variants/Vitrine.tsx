"use client";

import type { CSSProperties } from "react";
import { useRef } from "react";
import type { GelatoTokens } from "@/src/lib/gelato-tokens";
import { BASE_TOKENS, DRIZZLE_TOKENS } from "@/src/lib/gelato-tokens";
import { getCrumbleFill, makeCrumbleDots } from "./shared";

export type VitrineFlavour = {
  id: string;
  displayName: string;
  /** Optional; used with `selectedFlavourNames` for case-insensitive match against form values. */
  inputName?: string;
  tokens: GelatoTokens;
  isExclusive?: boolean;
  isBrandNew?: boolean;
  isVegan?: boolean;
};

export type VitrineProps = {
  flavours: VitrineFlavour[];
  /** @deprecated Ignored; layout uses column-flow grid. Kept for backwards compatibility. */
  columns?: number;
  onTabClick?: (id: string) => void;
  /** When set, tubs matching these names (vs `displayName` / `inputName`, case-insensitive) show selected styling. */
  selectedFlavourNames?: string[];
  seed?: string;
  className?: string;
  /** 'select' enables tap-to-toggle with ring + checkmark; 'display' (default) preserves existing behaviour. */
  mode?: "display" | "select";
  /** IDs of currently selected flavours (used in select mode). */
  selectedFlavourIds?: string[];
  /** Called with the flavour id when a tub is tapped in select mode. */
  onToggle?: (id: string) => void;
  /** Maximum simultaneous selections; unselected scoops beyond cap render at 50% opacity. */
  maxSelections?: number;
};

type LegacyVitrineProps = {
  tokens: GelatoTokens;
  size: number;
  seed?: string;
  className?: string;
};

const GRID_GAP = 12;
const SVG_VIEWBOX = "0 0 365 690";

const DRIZZLE_PATHS = [
  "M105.607 83.763C140.884 122.389 104.708 138.642 130.982 175.516",
  "M138.004 365.14C116.632 268.534 220.376 380.31 216.331 310.2",
  "M191.695 580.68C320.525 622.72 192.335 464.1 288.856 478.65",
  "M214 86C330.5 68.5 250.139 220.721 295.5 247",
  "M71.5 422.5C50 471 67.5 508.5 110.5 508.5",
] as const;

const PLACEHOLDER_GELATO = "#C4C4C4";

/** Vitrine tub shell (warm stainless + recessed shadow). */
const VITRINE_TRAY_OUTER = "#A8A895";
const VITRINE_TRAY_INNER = "#C9C2B5";

function isLegacyProps(props: VitrineProps | LegacyVitrineProps): props is LegacyVitrineProps {
  return "tokens" in props;
}

function resolveFlavours(props: VitrineProps | LegacyVitrineProps): VitrineFlavour[] {
  if (!isLegacyProps(props)) {
    return props.flavours;
  }

  return [
    {
      id: props.seed || "legacy-vitrine",
      displayName: BASE_TOKENS[props.tokens.base].name,
      tokens: props.tokens,
    },
  ];
}

function isTubSelected(flavour: VitrineFlavour, selectedFlavourNames: string[] | undefined): boolean {
  if (!selectedFlavourNames?.length) return false;
  const lowered = selectedFlavourNames.map((n) => n.trim().toLowerCase()).filter(Boolean);
  const dn = flavour.displayName.trim().toLowerCase();
  const inn = flavour.inputName?.trim().toLowerCase();
  return lowered.some((n) => n === dn || (inn != null && inn.length > 0 && n === inn));
}

function VitrineTubSvg({
  baseHex,
  drizzleStroke,
  drizzleOpacity,
  showDrizzle,
  crumbleDots,
  crumbleToken,
}: {
  baseHex: string;
  drizzleStroke: string;
  drizzleOpacity: number;
  showDrizzle: boolean;
  crumbleDots: ReturnType<typeof makeCrumbleDots>;
  crumbleToken: GelatoTokens["crumble"];
}) {
  return (
    <svg viewBox={SVG_VIEWBOX} width="100%" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="365" height="690" rx="57" fill={VITRINE_TRAY_OUTER} />
      <rect x="18" y="17" width="330" height="655" rx="57" fill={VITRINE_TRAY_INNER} />
      <rect
        x="24"
        y="24"
        width="317"
        height="642"
        rx="57"
        fill={baseHex}
        stroke="var(--gelato-edge, transparent)"
        strokeWidth={4}
      />
      {showDrizzle
        ? DRIZZLE_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke={drizzleStroke}
              strokeOpacity={drizzleOpacity}
              strokeWidth={12}
              strokeLinecap="round"
              fill="none"
            />
          ))
        : null}
      {crumbleToken !== "none"
        ? crumbleDots.map(({ x, y, rot, index }) => (
            <ellipse
              key={index}
              cx={x}
              cy={y}
              rx={7.5}
              ry={5}
              fill={getCrumbleFill(crumbleToken, index)}
              transform={`rotate(${rot} ${x} ${y})`}
            />
          ))
        : null}
    </svg>
  );
}

function PlaceholderTub() {
  return (
    <svg viewBox={SVG_VIEWBOX} width="100%" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="365" height="690" rx="57" fill={VITRINE_TRAY_OUTER} />
      <rect x="18" y="17" width="330" height="655" rx="57" fill={VITRINE_TRAY_INNER} />
      <rect
        x="24"
        y="24"
        width="317"
        height="642"
        rx="57"
        fill={PLACEHOLDER_GELATO}
        stroke="var(--gelato-edge, transparent)"
        strokeWidth={4}
      />
    </svg>
  );
}

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "repeat(2, auto)",
  gridAutoFlow: "column",
  gridAutoColumns: "minmax(140px, 1fr)",
  gap: GRID_GAP,
};

const labelStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
  color: "var(--text-primary)",
};

const emptyCaptionStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
  color: "var(--text-secondary)",
};

export function Vitrine(props: VitrineProps | LegacyVitrineProps) {
  // Hooks must be unconditional
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const flavours = resolveFlavours(props);
  const isSelectMode = !isLegacyProps(props) && props.mode === "select";
  const onTabClick = isLegacyProps(props) ? undefined : props.onTabClick;
  const selectedFlavourNames = isLegacyProps(props) ? undefined : props.selectedFlavourNames;
  const selectedFlavourIds = isLegacyProps(props) ? undefined : props.selectedFlavourIds;
  const onToggle = isLegacyProps(props) ? undefined : props.onToggle;
  const maxSelections = isLegacyProps(props) ? undefined : props.maxSelections;
  const seed = props.seed;
  const className = props.className;
  const legacyMaxWidth = isLegacyProps(props) ? props.size : undefined;

  const selectedCount = selectedFlavourIds?.length ?? 0;
  const atCap = maxSelections != null && selectedCount >= maxSelections;

  // Reset button refs array length each render
  buttonRefs.current = [];

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
      const clamped = Math.max(0, Math.min(flavours.length - 1, next));
      buttonRefs.current[clamped]?.focus();
    }
  }

  if (flavours.length === 0) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxHeight: 120,
          gap: 6,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ opacity: 0.35 }}>
          <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 15l4 7 4-7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <p style={emptyCaptionStyle}>No flavours yet</p>
      </div>
    );
  }

  const selectGridStyle: CSSProperties = {
    ...gridStyle,
    gridAutoColumns: "minmax(88px, 88px)",
    gap: 8,
  };

  const cells = flavours.map((flavour, idx) => {
    const tabSeed = seed ? `${seed}-${flavour.id}` : flavour.id;
    const drizzleMeta = DRIZZLE_TOKENS[flavour.tokens.drizzle];
    const showDrizzle = flavour.tokens.drizzle !== "none";
    const crumbleDots =
      flavour.tokens.crumble === "none"
        ? []
        : makeCrumbleDots({
            seed: tabSeed,
            count: 12,
            centerX: 182,
            centerY: 345,
            radius: 280,
            hemisphere: "full",
            minDistance: 80,
            maxRetriesPerDot: 12,
          });

    const baseHex = BASE_TOKENS[flavour.tokens.base].hex;

    const isSelected = isSelectMode
      ? (selectedFlavourIds?.includes(flavour.id) ?? false)
      : isTubSelected(flavour, selectedFlavourNames);

    const isDisabled = isSelectMode && atCap && !isSelected;

    const cellStyle: CSSProperties = {
      display: "flex",
      minWidth: 0,
      flexDirection: "column",
      ...(legacyMaxWidth !== undefined ? { maxWidth: legacyMaxWidth, width: "100%" } : null),
    };

    const selectedRing: CSSProperties = isSelected
      ? { boxShadow: "0 0 0 2px var(--brand-primary)", borderRadius: 12 }
      : {};

    const tubVisual = (
      <div style={{ position: "relative", width: "100%" }}>
        <VitrineTubSvg
          baseHex={baseHex}
          drizzleStroke={drizzleMeta.stroke}
          drizzleOpacity={drizzleMeta.opacity}
          showDrizzle={showDrizzle}
          crumbleDots={crumbleDots}
          crumbleToken={flavour.tokens.crumble}
        />
        {isSelected ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: 6,
              top: 6,
              display: "flex",
              height: 22,
              width: 22,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9999,
              background: "var(--brand-primary)",
              color: "var(--text-inverse)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              pointerEvents: "none",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </div>
    );

    const activeBadges = [
      flavour.isExclusive ? { symbol: "✦", label: "Exclusive" } : null,
      flavour.isBrandNew  ? { symbol: "⟳", label: "New" }       : null,
      flavour.isVegan     ? { symbol: "🌱", label: "Vegan" }     : null,
    ].filter(Boolean) as { symbol: string; label: string }[];

    // In select mode: no sub-label (ring + checkmark is the focal point)
    const body = isSelectMode ? tubVisual : (
      <>
        {tubVisual}
        <div style={labelStyle}>
          <div>{flavour.displayName}</div>
          {flavour.inputName &&
            flavour.inputName.toLowerCase() !== flavour.displayName.toLowerCase() && (
              <div className="text-[11px] text-[color:var(--text-secondary)] opacity-70">
                ({flavour.inputName})
              </div>
            )}
          {activeBadges.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {activeBadges.map(({ symbol, label }) => (
                <span
                  key={label}
                  title={label}
                  style={{ fontSize: 11, color: "#A85530", fontWeight: 600, lineHeight: 1 }}
                >
                  {symbol} {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </>
    );

    // ── Select mode cell ──
    if (isSelectMode) {
      return (
        <button
          key={flavour.id}
          ref={(el) => { buttonRefs.current[idx] = el; }}
          type="button"
          role="button"
          aria-pressed={isSelected}
          aria-label={`${flavour.displayName}${isSelected ? ", selected" : ""}`}
          disabled={isDisabled}
          onClick={() => { if (!isDisabled) onToggle?.(flavour.id); }}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          style={{
            all: "unset",
            display: "flex",
            flexDirection: "column",
            cursor: isDisabled ? "default" : "pointer",
            opacity: isDisabled ? 0.45 : 1,
            ...selectedRing,
            transition: "opacity 150ms, box-shadow 150ms",
          }}
        >
          {body}
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: 600,
              textAlign: "center",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {flavour.displayName}
          </div>
        </button>
      );
    }

    // ── Display mode cell (existing behaviour) ──
    if (!onTabClick) {
      return (
        <div key={flavour.id} style={{ ...cellStyle, ...selectedRing }}>
          {body}
        </div>
      );
    }

    return (
      <button
        key={flavour.id}
        type="button"
        aria-label={flavour.displayName}
        aria-pressed={isSelected}
        onClick={() => onTabClick(flavour.id)}
        onMouseEnter={(event) => { event.currentTarget.style.transform = "scale(1.02)"; }}
        onMouseLeave={(event) => { event.currentTarget.style.transform = "scale(1)"; }}
        onFocus={(event) => { event.currentTarget.style.outline = "2px solid var(--state-info)"; }}
        onBlur={(event) => { event.currentTarget.style.outline = "none"; }}
        style={{
          all: "unset",
          cursor: "pointer",
          ...cellStyle,
          ...selectedRing,
          transition: "transform 150ms, box-shadow 150ms",
        }}
      >
        {body}
      </button>
    );
  });

  // ── Select mode: scroll wrapper + cap caption ──
  if (isSelectMode) {
    const needsFade = flavours.length > 5;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            overflowX: "auto",
            WebkitOverflowScrolling: "touch" as CSSProperties["WebkitOverflowScrolling"],
            scrollbarWidth: "none" as CSSProperties["scrollbarWidth"],
            ...(needsFade
              ? {
                  maskImage:
                    "linear-gradient(to right, black 0%, black 82%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, black 0%, black 82%, transparent 100%)",
                }
              : {}),
          }}
        >
          <div
            className={className}
            style={{ ...selectGridStyle, minWidth: "max-content", paddingBottom: 4 }}
          >
            {cells}
          </div>
        </div>
        {atCap && maxSelections != null && (
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            Max {maxSelections} flavours
          </p>
        )}
      </div>
    );
  }

  // ── Display mode: original grid ──
  return (
    <div className={className} style={gridStyle}>
      {cells}
    </div>
  );
}
