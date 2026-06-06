import { describe, expect, it } from "vitest";
import {
  BASE_TOKENS,
  CRUMBLE_TOKENS,
  DRIZZLE_TOKENS,
  gelatoTokensFromNullableTokens,
} from "./gelato-tokens";

describe("gelato token catalog", () => {
  it("defines expected token counts", () => {
    expect(Object.keys(BASE_TOKENS)).toHaveLength(19);
    expect(Object.keys(DRIZZLE_TOKENS)).toHaveLength(8);
    expect(Object.keys(CRUMBLE_TOKENS)).toHaveLength(8);
  });

  it("uses hex colours for solid base tokens", () => {
    for (const token of Object.values(BASE_TOKENS)) {
      expect(token.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("defaults nullable unknown tokens to cream/none/none", () => {
    expect(gelatoTokensFromNullableTokens("unknown-base", "unknown-drizzle", "unknown-crumble")).toEqual({
      base: "unknown-base",
      drizzle: "unknown-drizzle",
      crumble: "unknown-crumble",
    });
  });
});
