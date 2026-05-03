"use client";

import type { GelatoTokens } from "@/src/lib/gelato-tokens";
import { Scoop } from "./variants/Scoop";
import { Cone } from "./variants/Cone";
import { Cup } from "./variants/Cup";
import { Vitrine } from "./variants/Vitrine";

export type GelatoProps = {
  variant: "scoop" | "cone" | "cup" | "vitrine";
  tokens: GelatoTokens;
  /**
   * Target scoop diameter in px.
   */
  size?: number;
  className?: string;
  /**
   * For stable crumble dot positions.
   * Defaults to `${base}-${drizzle}-${crumble}`.
   */
  seed?: string;
};

const TARGET_SCOOP_DIAMETER_DEFAULT = 140;

export function Gelato({
  variant,
  tokens,
  size,
  className,
  seed,
}: GelatoProps) {
  const targetScoopDiameter = size ?? TARGET_SCOOP_DIAMETER_DEFAULT;
  const resolvedSeed = seed ?? `${tokens.base}-${tokens.drizzle}-${tokens.crumble}`;

  switch (variant) {
    case "scoop":
      return (
        <Scoop
          tokens={tokens}
          size={targetScoopDiameter}
          seed={resolvedSeed}
          className={className}
        />
      );
    case "cone":
      return (
        <Cone
          tokens={tokens}
          size={targetScoopDiameter}
          seed={resolvedSeed}
          className={className}
        />
      );
    case "cup":
      return (
        <Cup
          tokens={tokens}
          size={targetScoopDiameter}
          seed={resolvedSeed}
          className={className}
        />
      );
    case "vitrine":
      return (
        <Vitrine
          tokens={tokens}
          size={targetScoopDiameter}
          seed={resolvedSeed}
          className={className}
        />
      );
    default:
      return null;
  }
}

