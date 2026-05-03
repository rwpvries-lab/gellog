/**
 * Token system for procedural gelato rendering
 * Base + Drizzle + Crumble = any flavour
 */

// ========== BASE TOKENS (16) ==========
// The main colour of the scoop

export const BASE_TOKENS = {
  'cream': { hex: '#FEFBDF', name: 'Cream' },
  'strawberry-pink': { hex: '#F9A8D4', name: 'Strawberry Pink' },
  'pistachio-green': { hex: '#A7C957', name: 'Pistachio Green' },
  'chocolate-brown': { hex: '#6B3E1E', name: 'Chocolate Brown' },
  'hazelnut-tan': { hex: '#C9986A', name: 'Hazelnut Tan' },
  'mango-yellow': { hex: '#F2C14E', name: 'Mango Yellow' },
  'lemon-pale': { hex: '#FFF6B7', name: 'Lemon Pale' },
  'mint-green': { hex: '#C7EBD1', name: 'Mint Green' },
  'coffee-mocha': { hex: '#5C3A21', name: 'Coffee Mocha' },
  'bubblegum-blue': { hex: '#A5D8F0', name: 'Bubblegum Blue' },
  'raspberry-red': { hex: '#D9486A', name: 'Raspberry Red' },
  'dulce-caramel': { hex: '#D69A5C', name: 'Dulce Caramel' },
  'cookies-cream': { hex: '#EFEAE0', name: 'Cookies & Cream' },
  'matcha-deep': { hex: '#7BA05B', name: 'Matcha Deep' },
  'coconut-white': { hex: '#F8F4EA', name: 'Coconut White' },
  'blueberry-purple': { hex: '#7E57C2', name: 'Blueberry Purple' },
} as const;

// ========== DRIZZLE TOKENS (8) ==========
// Curved stroke arcs (the swirls)

export const DRIZZLE_TOKENS = {
  'none': { stroke: 'transparent', opacity: 0 },
  'strawberry-swirl': { stroke: '#BC606D', opacity: 0.48 },
  'chocolate-swirl': { stroke: '#3E1F0E', opacity: 0.60 },
  'caramel-swirl': { stroke: '#A0671A', opacity: 0.55 },
  'raspberry-ripple': { stroke: '#C8324A', opacity: 0.50 },
  'honey-swirl': { stroke: '#E0A12A', opacity: 0.50 },
  'mango-swirl': { stroke: '#E89B22', opacity: 0.50 },
  'nutella-swirl': { stroke: '#5C3320', opacity: 0.65 },
} as const;

// ========== CRUMBLE TOKENS (8) ==========
// Small scattered dots (inclusions)

export const CRUMBLE_TOKENS = {
  'none': { fill: 'transparent' },
  'choc-shards': { fill: '#1E1E1E' },
  'biscuit-bits': { fill: '#9A6B3A' },
  'pistachio-pieces': { fill: '#7BA05B' },
  'cookie-crumb': { fill: '#5C3A21' },
  'fruit-chunks-red': { fill: '#D9486A' },
  'nut-pieces': { fill: '#C9986A' },
  'sprinkles-mixed': { fill: 'mixed' }, // special case: renders multicolor
} as const;

// ========== TYPESCRIPT TYPES ==========

export type BaseToken = keyof typeof BASE_TOKENS;
export type DrizzleToken = keyof typeof DRIZZLE_TOKENS;
export type CrumbleToken = keyof typeof CRUMBLE_TOKENS;

export interface GelatoTokens {
  base: BaseToken;
  drizzle: DrizzleToken;
  crumble: CrumbleToken;
}

// Helper type for database rows
export type FlavourTokens = {
  base_token: BaseToken;
  drizzle_token: DrizzleToken;
  crumble_token: CrumbleToken;
};

/** When resolver returns null tokens, fall back to plain cream scoop. */
export function gelatoTokensFromNullableTokens(
  base_token: string | null | undefined,
  drizzle_token: string | null | undefined,
  crumble_token: string | null | undefined,
): GelatoTokens {
  if (base_token == null) {
    return { base: "cream", drizzle: "none", crumble: "none" };
  }
  return {
    base: base_token as BaseToken,
    drizzle: (drizzle_token ?? "none") as DrizzleToken,
    crumble: (crumble_token ?? "none") as CrumbleToken,
  };
}
