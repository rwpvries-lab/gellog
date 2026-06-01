import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Gelato } from "../Gelato";
import { BASE_TOKENS, DRIZZLE_TOKENS, type GelatoTokens } from "@/src/lib/gelato-tokens";

const BASE_ONLY: GelatoTokens = { base: "chocolate-brown", drizzle: "none", crumble: "none" };
const BASE_DRIZZLE: GelatoTokens = { base: "strawberry-pink", drizzle: "strawberry-swirl", crumble: "none" };
const FULL: GelatoTokens = { base: "pistachio-green", drizzle: "chocolate-swirl", crumble: "pistachio-pieces" };

// ─── Scoop ───────────────────────────────────────────────────────────────────

describe("<Gelato variant='scoop'>", () => {
  it("renders an SVG for base-only tokens", () => {
    const { container } = render(<Gelato variant="scoop" tokens={BASE_ONLY} seed="test" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("fills the main circle with the base token hex color", () => {
    const { container } = render(<Gelato variant="scoop" tokens={BASE_ONLY} seed="test" />);
    const circles = container.querySelectorAll("circle");
    const baseHex = BASE_TOKENS["chocolate-brown"].hex;
    const filled = Array.from(circles).filter((c) => c.getAttribute("fill") === baseHex);
    expect(filled.length).toBeGreaterThan(0);
  });

  it("renders NO drizzle paths when drizzle=none", () => {
    const { container } = render(<Gelato variant="scoop" tokens={BASE_ONLY} seed="test" />);
    expect(container.querySelectorAll("path")).toHaveLength(0);
  });

  it("renders drizzle paths when drizzle token is set", () => {
    const { container } = render(<Gelato variant="scoop" tokens={BASE_DRIZZLE} seed="test" />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(0);
    const expectedStroke = DRIZZLE_TOKENS["strawberry-swirl"].stroke;
    const drizzlePaths = Array.from(paths).filter((p) => p.getAttribute("stroke") === expectedStroke);
    expect(drizzlePaths.length).toBeGreaterThan(0);
  });

  it("renders NO crumble ellipses when crumble=none", () => {
    const { container } = render(<Gelato variant="scoop" tokens={BASE_ONLY} seed="test" />);
    // Scoop uses <circle> for its body; crumble dots are <ellipse>
    expect(container.querySelectorAll("ellipse")).toHaveLength(0);
  });

  it("renders crumble ellipses when full token set is given", () => {
    const { container } = render(<Gelato variant="scoop" tokens={FULL} seed="test" />);
    expect(container.querySelectorAll("ellipse").length).toBeGreaterThan(0);
  });
});

// ─── Cone ────────────────────────────────────────────────────────────────────

describe("<Gelato variant='cone'>", () => {
  it("renders an SVG", () => {
    const { container } = render(<Gelato variant="cone" tokens={BASE_ONLY} seed="test" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("cone always renders structural paths (waffle pattern)", () => {
    const { container } = render(<Gelato variant="cone" tokens={BASE_ONLY} seed="test" />);
    // The cone has 3 structural paths (bg, waffle, highlight) regardless of tokens
    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(3);
  });

  it("renders additional drizzle paths when drizzle token is set", () => {
    const withoutDrizzle = render(<Gelato variant="cone" tokens={BASE_ONLY} seed="test" />);
    const withDrizzle = render(<Gelato variant="cone" tokens={BASE_DRIZZLE} seed="test" />);
    const noDrizzleCount = withoutDrizzle.container.querySelectorAll("path").length;
    const drizzleCount = withDrizzle.container.querySelectorAll("path").length;
    expect(drizzleCount).toBeGreaterThan(noDrizzleCount);
  });

  it("renders crumble ellipses when full token set is given", () => {
    const { container } = render(<Gelato variant="cone" tokens={FULL} seed="test" />);
    expect(container.querySelectorAll("ellipse").length).toBeGreaterThan(0);
  });

  it("adding crumble token increases ellipse count (structural ellipses stay constant)", () => {
    // Cone always renders 6 structural ellipses (5 drip circles + 1 scoop body).
    // With crumble tokens, extra <ellipse> dots are added on top.
    const noCrumble = render(<Gelato variant="cone" tokens={BASE_DRIZZLE} seed="test" />);
    const withCrumble = render(<Gelato variant="cone" tokens={FULL} seed="test" />);
    const base = noCrumble.container.querySelectorAll("ellipse").length;
    const extra = withCrumble.container.querySelectorAll("ellipse").length;
    expect(extra).toBeGreaterThan(base);
  });
});

// ─── Cup ─────────────────────────────────────────────────────────────────────

describe("<Gelato variant='cup'>", () => {
  it("renders an SVG", () => {
    const { container } = render(<Gelato variant="cup" tokens={BASE_ONLY} seed="test" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders drizzle paths inside the scoop when drizzle token is set", () => {
    const withDrizzle = render(<Gelato variant="cup" tokens={BASE_DRIZZLE} seed="test" />);
    const drizzleStroke = DRIZZLE_TOKENS["strawberry-swirl"].stroke;
    const drizzlePaths = Array.from(withDrizzle.container.querySelectorAll("path")).filter(
      (p) => p.getAttribute("stroke") === drizzleStroke,
    );
    expect(drizzlePaths.length).toBeGreaterThan(0);
  });

  it("renders crumble ellipses inside the scoop for full token set", () => {
    const { container } = render(<Gelato variant="cup" tokens={FULL} seed="test" />);
    // Full tokens includes crumble; expect crumble ellipses to appear inside the nested scoop
    expect(container.querySelectorAll("ellipse").length).toBeGreaterThan(0);
  });
});

// ─── Token token combinations ─────────────────────────────────────────────────

describe("token rendering parity", () => {
  it("base-only and base+drizzle produce different SVG output", () => {
    const baseOnly = render(<Gelato variant="scoop" tokens={BASE_ONLY} seed="t" />);
    const withDrizzle = render(<Gelato variant="scoop" tokens={BASE_DRIZZLE} seed="t" />);
    expect(baseOnly.container.innerHTML).not.toBe(withDrizzle.container.innerHTML);
  });

  it("base+drizzle and base+drizzle+crumble produce different SVG output", () => {
    const withDrizzle = render(<Gelato variant="scoop" tokens={BASE_DRIZZLE} seed="t" />);
    const full = render(<Gelato variant="scoop" tokens={FULL} seed="t" />);
    expect(withDrizzle.container.innerHTML).not.toBe(full.container.innerHTML);
  });

  it("deterministic: same seed produces identical output", () => {
    const first = render(<Gelato variant="scoop" tokens={FULL} seed="fixed-seed" />);
    const second = render(<Gelato variant="scoop" tokens={FULL} seed="fixed-seed" />);
    expect(first.container.innerHTML).toBe(second.container.innerHTML);
  });

  it("different seeds produce different crumble dot positions", () => {
    const a = render(<Gelato variant="scoop" tokens={FULL} seed="seed-a" />);
    const b = render(<Gelato variant="scoop" tokens={FULL} seed="seed-b" />);
    expect(a.container.innerHTML).not.toBe(b.container.innerHTML);
  });
});
