import type { CrumbleToken } from "@/src/lib/gelato-tokens";
import { CRUMBLE_TOKENS } from "@/src/lib/gelato-tokens";

export type CrumbleDot = {
  x: number;
  y: number;
  rot: number;
  index: number;
};

function quantize(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToUint32(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

export function makeCrumbleDots(params: {
  seed: string;
  count?: number;
  centerX: number;
  centerY: number;
  radius: number;
  edgePadding?: number;
  minDistance?: number;
  maxRetriesPerDot?: number;
  hemisphere?: "upper" | "full" | "top";
}): CrumbleDot[] {
  const {
    seed,
    count = 7,
    centerX,
    centerY,
    radius,
    edgePadding = 18,
    minDistance = 0,
    maxRetriesPerDot = 10,
    hemisphere = "upper",
  } = params;
  const seedHash = hashStringToUint32(seed);
  const rng = mulberry32(seedHash);
  const dotMaxR = radius - edgePadding;
  const placed: CrumbleDot[] = [];

  function sampleCandidate(index: number): CrumbleDot {
    /* "upper" | "top": θ ∈ (π, 2π) → upper half of disc in SVG coords (smaller y). */
    const theta =
      hemisphere === "full" ? rng() * Math.PI * 2 : Math.PI + rng() * Math.PI;
    const rr = Math.sqrt(rng()) * dotMaxR;
    const x = centerX + rr * Math.cos(theta);
    const y = centerY + rr * Math.sin(theta);
    const rot = 30 + rng() * 120;
    return {
      x: quantize(x),
      y: quantize(y),
      rot: quantize(rot),
      index,
    };
  }

  for (let index = 0; index < count; index++) {
    let chosen = sampleCandidate(index);
    for (let attempt = 0; attempt < maxRetriesPerDot; attempt++) {
      const tooClose = placed.some((dot) => {
        const dx = chosen.x - dot.x;
        const dy = chosen.y - dot.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      });
      if (!tooClose) break;
      chosen = sampleCandidate(index);
    }
    placed.push(chosen);
  }

  return placed;
}

export function getCrumbleFill(token: CrumbleToken, index: number): string {
  if (token === "sprinkles-mixed") {
    const mixed = ["#D9486A", "#F2C14E", "#A7C957", "#7E57C2", "#A5D8F0"];
    return mixed[index % mixed.length];
  }
  return CRUMBLE_TOKENS[token].fill;
}

