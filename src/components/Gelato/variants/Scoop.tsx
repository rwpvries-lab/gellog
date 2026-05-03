"use client";

import type { GelatoTokens } from "@/src/lib/gelato-tokens";
import { BASE_TOKENS, DRIZZLE_TOKENS } from "@/src/lib/gelato-tokens";
import { getCrumbleFill, makeCrumbleDots } from "./shared";

export type ScoopProps = {
  tokens: GelatoTokens;
  size: number; // px width
  seed: string;
  className?: string;
  hideDrips?: boolean;
};

export function Scoop({
  tokens,
  size,
  seed,
  className,
  hideDrips = false,
}: ScoopProps) {
  const base = BASE_TOKENS[tokens.base];
  const height = (size * 602) / 602;
  const dotRx = 16;
  const dotRy = 10;

  const crumblePositions =
    tokens.crumble === "none"
      ? []
      : makeCrumbleDots({
          seed,
          centerX: 306.719,
          centerY: 303.461,
          radius: 303.461,
          edgePadding: 30,
          minDistance: 50,
          maxRetriesPerDot: 8,
          hemisphere: "full",
        });

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height,
      }}
    >
      <svg
        viewBox="0 0 629 652"
        width={size}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Main body */}
        <circle
          cx={306.719}
          cy={303.461}
          r={303.461}
          fill={base.hex}
          stroke="var(--gelato-edge, transparent)"
          strokeWidth={8}
        />

        {/* Bottom circles */}
        {!hideDrips ? (
          <>
            <circle
              cx={99.5731}
              cy={552.393}
              r={99.5731}
              fill={base.hex}
              stroke="var(--gelato-edge, transparent)"
              strokeWidth={6}
            />
            <circle
              cx={199.146}
              cy={552.393}
              r={99.5731}
              fill={base.hex}
              stroke="var(--gelato-edge, transparent)"
              strokeWidth={6}
            />
            <circle
              cx={298.719}
              cy={552.393}
              r={99.5731}
              fill={base.hex}
              stroke="var(--gelato-edge, transparent)"
              strokeWidth={6}
            />
            <circle
              cx={429.112}
              cy={552.393}
              r={99.5731}
              fill={base.hex}
              stroke="var(--gelato-edge, transparent)"
              strokeWidth={6}
            />
            <circle
              cx={528.685}
              cy={552.393}
              r={99.5731}
              fill={base.hex}
              stroke="var(--gelato-edge, transparent)"
              strokeWidth={6}
            />
          </>
        ) : null}

        {/* Drizzle arcs */}
        {tokens.drizzle !== "none" ? (
          <>
            <path
              stroke={DRIZZLE_TOKENS[tokens.drizzle].stroke}
              opacity={DRIZZLE_TOKENS[tokens.drizzle].opacity}
              strokeWidth={24}
              strokeLinecap="round"
              d="M97.2019 243.005C146.843 129.355 216.927 192.034 271.454 99.5723"
            />
            <path
              stroke={DRIZZLE_TOKENS[tokens.drizzle].stroke}
              opacity={DRIZZLE_TOKENS[tokens.drizzle].opacity}
              strokeWidth={24}
              strokeLinecap="round"
              d="M270.01 386.438C221.262 385.135 198.813 374.78 172.152 329.94"
            />
            <path
              stroke={DRIZZLE_TOKENS[tokens.drizzle].stroke}
              opacity={DRIZZLE_TOKENS[tokens.drizzle].opacity}
              strokeWidth={24}
              strokeLinecap="round"
              d="M483.641 149.359C555.95 193.219 566.619 267.898 522.759 363.914"
            />
          </>
        ) : null}

        {/* Crumble dots */}
        {tokens.crumble !== "none"
          ? crumblePositions.map(({ x, y, rot, index }) => {
              const fill = getCrumbleFill(tokens.crumble, index);
              return (
                <ellipse
                  key={index}
                  cx={x}
                  cy={y}
                  rx={dotRx}
                  ry={dotRy}
                  fill={fill}
                  transform={`rotate(${rot} ${x} ${y})`}
                />
              );
            })
          : null}
      </svg>
    </span>
  );
}

