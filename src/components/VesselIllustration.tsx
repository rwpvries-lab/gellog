"use client";

import React from "react";

// VesselIllustration — premium illustrated SVG components for cup and cone

export type VesselFlavour = {
  name: string;
  colorHex: string;
};

type VesselIllustrationProps = {
  vessel: "cup" | "cone";
  flavours?: VesselFlavour[];
  selected?: boolean;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
};

// Default scoop colors when no flavours are provided
const DEFAULT_SCOOP_COLORS = ["#F4A7B9", "#A8C5A0", "#F5E6C8"];

const FLAVOUR_COLOR_KEYWORDS: [string, string][] = [
  ["pistachio", "#A8C5A0"],
  ["stracciatella", "#F5E6C8"],
  ["strawberry", "#F4A7B9"],
  ["aardbei", "#F4A7B9"],
  ["chocolate", "#7B5E3A"],
  ["chocolade", "#7B5E3A"],
  ["vanilla", "#F5E6C8"],
  ["vanille", "#F5E6C8"],
  ["lemon", "#F4E04D"],
  ["citroen", "#F4E04D"],
  ["blueberry", "#5B7EC0"],
  ["mango", "#FFA94D"],
  ["mint", "#A8E6CF"],
  ["hazelnut", "#C49A6C"],
  ["hazelnoot", "#C49A6C"],
  ["raspberry", "#E05A7A"],
  ["framboos", "#E05A7A"],
  ["caramel", "#D4A5A5"],
  ["bubblegum", "#B5D5E8"],
  ["coconut", "#E8E0D0"],
  ["kokos", "#E8E0D0"],
];

const DEFAULT_PALETTE = ["#F4A7B9", "#A8C5A0", "#F5E6C8", "#FFA94D", "#5B7EC0"];

export function getFlavourColor(name: string, index: number): string {
  const lower = name.toLowerCase();
  for (const [keyword, color] of FLAVOUR_COLOR_KEYWORDS) {
    if (lower.includes(keyword)) return color;
  }
  return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
}

// Darken a hex color by a percentage
function darkenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - Math.round(((num >> 16) * amount) / 100));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round((((num >> 8) & 0xff) * amount) / 100));
  const b = Math.max(0, (num & 0xff) - Math.round(((num & 0xff) * amount) / 100));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const SIZE_MAP = {
  small: { width: 60, height: 70 },
  medium: { width: 90, height: 105 },
  large: { width: 120, height: 150 },
};

// ─── Cone Illustration ────────────────────────────────────────────────────────
// viewBox: 0 0 60 90
// Cone bottom half: warm tan trapezoid with crosshatch lines
// Scoops: 1–3 circles stacked above the cone

function ConeIllustration({ scoopColors }: { scoopColors: string[] }) {
  const numScoops = Math.min(scoopColors.length || 1, 3);
  const colors = scoopColors.length > 0 ? scoopColors.slice(0, 3) : DEFAULT_SCOOP_COLORS.slice(0, numScoops);

  // Cone geometry (in 60x90 viewBox)
  const coneTopY = 52;
  const coneTopLeft = 9;
  const coneTopRight = 51;
  const coneTipX = 30;
  const coneTipY = 86;

  // Scoop positions — stack from bottom scoop up
  const scoopData = [
    { cx: 30, cy: 46, r: 12 },
    { cx: 30, cy: 34, r: 11 },
    { cx: 30, cy: 23, r: 10 },
  ].slice(0, numScoops);

  const tanColor = "#C49A6C";
  const darkTan = "#A67C52";

  // Crosshatch lines clipped to cone shape
  // Generate diagonal lines going both ways
  const crosshatchLines: React.ReactElement[] = [];
  for (let i = -30; i < 60; i += 7) {
    crosshatchLines.push(
      <line key={`d1-${i}`} x1={i} y1={coneTopY} x2={i + 40} y2={coneTipY + 10} stroke={darkTan} strokeWidth="0.7" opacity="0.5" />,
      <line key={`d2-${i}`} x1={i + 40} y1={coneTopY} x2={i} y2={coneTipY + 10} stroke={darkTan} strokeWidth="0.7" opacity="0.5" />,
    );
  }

  return (
    <svg viewBox="0 0 60 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        {/* Clip path for the cone shape */}
        <clipPath id="cone-clip">
          <polygon points={`${coneTopLeft},${coneTopY} ${coneTopRight},${coneTopY} ${coneTipX},${coneTipY}`} />
        </clipPath>
        {/* Gradient for each scoop */}
        {colors.map((color, i) => (
          <linearGradient key={i} id={`scoop-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={darkenHex(color, 24)} />
          </linearGradient>
        ))}
      </defs>

      {/* ── Cone body ── */}
      <polygon
        points={`${coneTopLeft},${coneTopY} ${coneTopRight},${coneTopY} ${coneTipX},${coneTipY}`}
        fill={tanColor}
      />
      {/* Crosshatch pattern clipped to cone */}
      <g clipPath="url(#cone-clip)">
        {crosshatchLines}
      </g>
      {/* Cone top edge */}
      <line x1={coneTopLeft} y1={coneTopY} x2={coneTopRight} y2={coneTopY} stroke={darkTan} strokeWidth="1.2" />

      {/* ── Scoops (bottom to top, so last index renders on top) ── */}
      {[...scoopData].reverse().map((scoop, revIdx) => {
        const idx = numScoops - 1 - revIdx;
        const color = colors[idx] ?? DEFAULT_SCOOP_COLORS[idx] ?? "#F5E6C8";
        return (
          <g key={idx}>
            <circle
              cx={scoop.cx}
              cy={scoop.cy}
              r={scoop.r}
              fill={`url(#scoop-grad-${idx})`}
            />
            {/* Shine highlight */}
            <ellipse
              cx={scoop.cx - scoop.r * 0.28}
              cy={scoop.cy - scoop.r * 0.3}
              rx={scoop.r * 0.32}
              ry={scoop.r * 0.18}
              fill="white"
              opacity="0.3"
              transform={`rotate(-30, ${scoop.cx - scoop.r * 0.28}, ${scoop.cy - scoop.r * 0.3})`}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Cup Illustration ─────────────────────────────────────────────────────────
// viewBox: 0 0 60 90
// Cup: trapezoid wider at top, rounded bottom, white with subtle stripes
// Scoops peek out above the cup rim
// A small spoon leans to one side

function CupIllustration({ scoopColors }: { scoopColors: string[] }) {
  const numScoops = Math.min(scoopColors.length || 1, 3);
  const colors = scoopColors.length > 0 ? scoopColors.slice(0, 3) : DEFAULT_SCOOP_COLORS.slice(0, numScoops);

  // Cup geometry
  const cupTopY = 50;
  const cupTopLeft = 10;
  const cupTopRight = 50;
  const cupBottomLeft = 17;
  const cupBottomRight = 43;
  const cupBottomY = 83;

  // Scoop positions
  const scoopData = [
    { cx: 30, cy: 44, r: 12 },
    { cx: 30, cy: 32, r: 11 },
    { cx: 30, cy: 21, r: 10 },
  ].slice(0, numScoops);

  return (
    <svg viewBox="0 0 60 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        {colors.map((color, i) => (
          <linearGradient key={i} id={`cup-scoop-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={darkenHex(color, 24)} />
          </linearGradient>
        ))}
        <clipPath id="cup-clip">
          <path d={`M${cupTopLeft},${cupTopY} L${cupTopRight},${cupTopY} L${cupBottomRight},${cupBottomY} Q30,${cupBottomY + 5} ${cupBottomLeft},${cupBottomY} Z`} />
        </clipPath>
      </defs>

      {/* ── Scoops (behind cup rim) ── */}
      {[...scoopData].reverse().map((scoop, revIdx) => {
        const idx = numScoops - 1 - revIdx;
        const color = colors[idx] ?? DEFAULT_SCOOP_COLORS[idx] ?? "#F5E6C8";
        return (
          <g key={idx}>
            <circle
              cx={scoop.cx}
              cy={scoop.cy}
              r={scoop.r}
              fill={`url(#cup-scoop-grad-${idx})`}
            />
            {/* Shine */}
            <ellipse
              cx={scoop.cx - scoop.r * 0.28}
              cy={scoop.cy - scoop.r * 0.3}
              rx={scoop.r * 0.32}
              ry={scoop.r * 0.18}
              fill="white"
              opacity="0.3"
              transform={`rotate(-30, ${scoop.cx - scoop.r * 0.28}, ${scoop.cy - scoop.r * 0.3})`}
            />
          </g>
        );
      })}

      {/* ── Cup body ── */}
      <path
        d={`M${cupTopLeft},${cupTopY} L${cupTopRight},${cupTopY} L${cupBottomRight},${cupBottomY} Q30,${cupBottomY + 6} ${cupBottomLeft},${cupBottomY} Z`}
        fill="white"
        stroke="var(--color-border, #E4E4E7)"
        strokeWidth="1"
      />

      {/* Subtle dot pattern on cup */}
      <g clipPath="url(#cup-clip)" opacity="0.18">
        {[54, 61, 68, 75].map((y) =>
          [16, 23, 30, 37, 44].map((x) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="var(--color-orange, #F97316)" />
          ))
        )}
      </g>

      {/* Cup rim highlight */}
      <line
        x1={cupTopLeft + 1}
        y1={cupTopY}
        x2={cupTopRight - 1}
        y2={cupTopY}
        stroke="var(--color-border, #E4E4E7)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Spoon leaning to the right */}
      <line x1="44" y1="48" x2="48" y2="72" stroke="var(--color-border, #A1A1AA)" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="45.5" cy="46" rx="3" ry="2" fill="none" stroke="var(--color-border, #A1A1AA)" strokeWidth="1.2" />
    </svg>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function VesselIllustration({
  vessel,
  flavours = [],
  selected = false,
  size = "medium",
  onClick,
}: VesselIllustrationProps) {
  const { width, height } = SIZE_MAP[size];
  const scoopColors = flavours.map((f) => f.colorHex);

  return (
    <div
      onClick={onClick}
      style={{
        width,
        height,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        border: selected
          ? "2px solid var(--color-orange, #F97316)"
          : "2px solid var(--color-border, #E4E4E7)",
        transform: selected ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.2s ease, border-color 0.2s ease",
        cursor: onClick ? "pointer" : "default",
        background: "var(--color-surface, white)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div style={{ width: width - 8, height: height - 8 }}>
        {vessel === "cone" ? (
          <ConeIllustration scoopColors={scoopColors} />
        ) : (
          <CupIllustration scoopColors={scoopColors} />
        )}
      </div>
    </div>
  );
}
