"use client";

import { Gelato } from "@/src/components/Gelato/Gelato";
import { PLACEHOLDER_GELATO_TOKENS } from "@/src/lib/gelato-placeholder-tokens";

type Props = {
  size: number;
  className?: string;
  seed?: string;
};

/** Generic cream scoop for empty states and non-flavour markers (replaces 🍦 icons). */
export function PlaceholderScoop({ size, className, seed = "placeholder" }: Props) {
  return (
    <span className={className} aria-hidden>
      <Gelato variant="scoop" tokens={PLACEHOLDER_GELATO_TOKENS} size={size} seed={seed} />
    </span>
  );
}
