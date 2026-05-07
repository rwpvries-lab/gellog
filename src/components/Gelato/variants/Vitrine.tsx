"use client";

import type { CSSProperties } from "react";
import type { GelatoTokens } from "@/src/lib/gelato-tokens";
import { BASE_TOKENS, DRIZZLE_TOKENS } from "@/src/lib/gelato-tokens";
import { getCrumbleFill, makeCrumbleDots } from "./shared";

export type VitrineFlavour = {
  id: string;
  displayName: string;
  /** Optional; used with `selectedFlavourNames` for case-insensitive match against form values. */
  inputName?: string;
  tokens: GelatoTokens;
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
      <rect x="0" y="0" width="365" height="690" rx="57" fill="#B5B5B5" />
      <rect x="18" y="17" width="330" height="655" rx="57" fill="#D9D9D9" />
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
      <rect x="0" y="0" width="365" height="690" rx="57" fill="#B5B5B5" />
      <rect x="18" y="17" width="330" height="655" rx="57" fill="#D9D9D9" />
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
  const flavours = resolveFlavours(props);
  const onTabClick = isLegacyProps(props) ? undefined : props.onTabClick;
  const selectedFlavourNames = isLegacyProps(props) ? undefined : props.selectedFlavourNames;
  const seed = props.seed;
  const className = props.className;
  const legacyMaxWidth = isLegacyProps(props) ? props.size : undefined;

  if (flavours.length === 0) {
    return (
      <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ ...gridStyle, width: "100%", maxWidth: 365 }}>
          <div style={{ display: "flex", minWidth: 0, flexDirection: "column" }}>
            <PlaceholderTub />
          </div>
          <div style={{ display: "flex", minWidth: 0, flexDirection: "column" }}>
            <PlaceholderTub />
          </div>
        </div>
        <p style={emptyCaptionStyle}>No flavours yet</p>
      </div>
    );
  }

  return (
    <div className={className} style={gridStyle}>
      {flavours.map((flavour) => {
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

        const cellStyle: CSSProperties = {
          display: "flex",
          minWidth: 0,
          flexDirection: "column",
          ...(legacyMaxWidth !== undefined ? { maxWidth: legacyMaxWidth, width: "100%" } : null),
        };

        const isSelected = isTubSelected(flavour, selectedFlavourNames);

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

        const body = (
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
            </div>
          </>
        );

        const selectedRing: CSSProperties = isSelected
          ? {
              boxShadow: "0 0 0 2px var(--brand-primary)",
              borderRadius: 12,
            }
          : {};

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
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "scale(1)";
            }}
            onFocus={(event) => {
              event.currentTarget.style.outline = "2px solid var(--state-info)";
            }}
            onBlur={(event) => {
              event.currentTarget.style.outline = "none";
            }}
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
      })}
    </div>
  );
}
