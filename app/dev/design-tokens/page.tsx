"use client";

import { useMemo, useState } from "react";
import { darkTokens, lightTokens, typography } from "@/src/lib/theme";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : clean;

  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function formatRatio(value: number): string {
  return `${value.toFixed(2)}:1`;
}

function passBodyAA(value: number): boolean {
  return value >= 4.5;
}

function passLargeAA(value: number): boolean {
  return value >= 3;
}

const textTokenKeys = [
  "textPrimary",
  "textSecondary",
  "textTertiary",
  "textInverse",
] as const;
const bgTokenKeys = [
  "backgroundPrimary",
  "backgroundSecondary",
  "backgroundTertiary",
  "surfaceElevated",
  "brandPrimary",
  "brandSecondary",
  "brandPrimarySurface",
] as const;

function isForbiddenPair(
  textKey: (typeof textTokenKeys)[number],
  bgKey: (typeof bgTokenKeys)[number],
): boolean {
  if (
    textKey === "textInverse" &&
    (bgKey === "backgroundPrimary" ||
      bgKey === "backgroundSecondary" ||
      bgKey === "backgroundTertiary" ||
      bgKey === "surfaceElevated")
  ) {
    return true;
  }
  if (textKey === "textPrimary" && bgKey === "brandSecondary") return true;
  if (textKey === "textSecondary" && (bgKey === "brandPrimary" || bgKey === "brandSecondary")) {
    return true;
  }
  if (textKey === "textTertiary" && bgKey === "brandPrimary") return true;
  if (textKey === "textInverse" && bgKey === "brandPrimarySurface") return true;
  return false;
}

export default function DesignTokensPage() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const tokens = mode === "light" ? lightTokens : darkTokens;

  const pairs = useMemo(() => {
    return textTokenKeys.flatMap((textKey) =>
      bgTokenKeys.map((bgKey) => {
        const textHex = tokens[textKey];
        const bgHex = tokens[bgKey];
        const ratio = contrastRatio(textHex, bgHex);
        return { textKey, bgKey, textHex, bgHex, ratio };
      }),
    );
  }, [tokens]);

  const failedBodyPairs = pairs.filter((p) => !passBodyAA(p.ratio));
  const failedLargePairs = pairs.filter((p) => !passLargeAA(p.ratio));

  const colorEntries = Object.entries(tokens).filter(([, value]) =>
    value.startsWith("#"),
  ) as [keyof typeof tokens, string][];

  return (
    <div className={mode === "dark" ? "dark" : ""}>
      <main
        className="min-h-screen overflow-y-auto p-6 md:p-8"
        style={{
          backgroundColor: tokens.backgroundPrimary,
          color: tokens.textPrimary,
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-semibold">Design Tokens Preview</h1>
              <p className="mt-1 text-sm opacity-80">
                Temporary route for palette + typography validation.
              </p>
            </div>

            <div className="inline-flex rounded-full border p-1">
              <button
                type="button"
                onClick={() => setMode("light")}
                className="rounded-full px-4 py-1.5 text-sm font-semibold"
                style={{
                  background: mode === "light" ? tokens.brandPrimary : "transparent",
                  color: mode === "light" ? tokens.textInverse : tokens.textPrimary,
                }}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setMode("dark")}
                className="rounded-full px-4 py-1.5 text-sm font-semibold"
                style={{
                  background: mode === "dark" ? tokens.brandPrimary : "transparent",
                  color: mode === "dark" ? tokens.textInverse : tokens.textPrimary,
                }}
              >
                Dark
              </button>
            </div>
          </header>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">Color Tokens</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {colorEntries.map(([name, value]) => (
                <article
                  key={name}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: tokens.borderDefault,
                    backgroundColor: tokens.surfaceElevated,
                  }}
                >
                  <div
                    className="mb-3 h-16 rounded-xl border"
                    style={{ backgroundColor: value, borderColor: tokens.borderStrong }}
                  />
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-xs opacity-80">{value}</p>
                  <p
                    className="mt-2 rounded-md px-2 py-1 text-xs"
                    style={{ backgroundColor: tokens.backgroundSecondary }}
                  >
                    Sample text for contrast check
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">Typography Ladder</h2>
            <div
              className="rounded-2xl border p-5"
              style={{
                borderColor: tokens.borderDefault,
                backgroundColor: tokens.surfaceElevated,
              }}
            >
              <p className="font-serif text-[54px] font-semibold leading-[1.05] tracking-[-0.02em]">
                Display Hero Fraunces
              </p>
              <p className="mt-2 font-serif text-[28px] font-semibold leading-[1.2]">
                Display Large Fraunces
              </p>
              <p className="mt-2 font-serif text-[24px] font-medium leading-[1.25]">
                Display Medium Fraunces
              </p>
              <p className="mt-3 font-serif text-[20px] font-medium leading-[1.3]">
                Heading MD Fraunces
              </p>
              <p className="mt-4 text-base font-normal leading-[1.5]">
                Body Large Plus Jakarta Sans
              </p>
              <p className="mt-1 text-sm font-normal leading-[1.5]">
                Body Default Plus Jakarta Sans
              </p>
              <p className="mt-1 text-[13px] font-normal leading-[1.45]">
                Body Small Plus Jakarta Sans
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.08em]">
                Caption Uppercase
              </p>
              <p className="mt-4 text-[28px] font-bold leading-[1.15]">0123456789</p>

              <pre
                className="mt-5 overflow-x-auto rounded-xl p-3 text-xs"
                style={{ backgroundColor: tokens.backgroundSecondary }}
              >
                {JSON.stringify(typography, null, 2)}
              </pre>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">Component Mockups</h2>
            <div
              className="rounded-2xl border p-5"
              style={{
                borderColor: tokens.borderDefault,
                backgroundColor: tokens.surfaceElevated,
              }}
            >
              <div className="mb-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: tokens.brandPrimary,
                    color: tokens.textInverse,
                  }}
                >
                  Primary CTA
                </button>
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                  style={{
                    borderColor: tokens.brandSecondary,
                    color: tokens.brandSecondary,
                    backgroundColor: "transparent",
                  }}
                >
                  Secondary
                </button>
              </div>

              <article
                className="mb-4 rounded-xl border p-4"
                style={{
                  borderColor: tokens.borderDefault,
                  backgroundColor: tokens.backgroundSecondary,
                }}
              >
                <h3 className="font-serif text-xl font-semibold">Card Title in Fraunces</h3>
                <p className="mt-2 text-sm">
                  Creamy hazelnut with toasted almond ripple and sea-salt caramel.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Hazelnut", "Creamy", "Nutty"].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: tokens.brandPrimarySurface,
                        color: tokens.textPrimary,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </article>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "LOGS", value: "43" },
                  { label: "AVG", value: "3.8 / 5" },
                  { label: "SCOOPS", value: "126" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: tokens.borderDefault,
                      backgroundColor: tokens.backgroundPrimary,
                    }}
                  >
                    <p className="text-[28px] font-bold leading-[1.15]">{stat.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.08em] opacity-80">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">WCAG Contrast Matrix</h2>
            <div
              className="rounded-2xl border p-5"
              style={{
                borderColor: tokens.borderDefault,
                backgroundColor: tokens.surfaceElevated,
              }}
            >
              <p className="mb-3 text-sm">
                Body AA threshold: 4.5:1, Large text AA threshold: 3:1.
              </p>

              <div className="grid gap-3">
                {pairs.map((pair) => {
                  const bodyOk = passBodyAA(pair.ratio);
                  const largeOk = passLargeAA(pair.ratio);
                  const forbidden = isForbiddenPair(pair.textKey, pair.bgKey);

                  return (
                    <div
                      key={`${pair.textKey}-${pair.bgKey}`}
                      className="rounded-xl border p-3"
                      style={{ borderColor: tokens.borderDefault }}
                    >
                      <p className="text-sm font-semibold">
                        {pair.textKey} on {pair.bgKey}
                        {forbidden ? (
                          <span
                            className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              color: tokens.textPrimary,
                              backgroundColor: tokens.brandPrimaryMuted,
                            }}
                          >
                            expected - forbidden pairing
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span
                          className="rounded px-2 py-1 text-xs"
                          style={{
                            color: pair.textHex,
                            backgroundColor: pair.bgHex,
                            border: `1px solid ${tokens.borderStrong}`,
                          }}
                        >
                          Sample Aa
                        </span>
                        <span className="text-xs">{formatRatio(pair.ratio)}</span>
                        <span
                          className="text-xs"
                          style={{ color: bodyOk ? tokens.stateSuccess : tokens.stateError }}
                        >
                          Body: {bodyOk ? "PASS" : "FAIL"}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: largeOk ? tokens.stateSuccess : tokens.stateError }}
                        >
                          Large: {largeOk ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-2 text-sm">
                <p>
                  Failed body pairs:{" "}
                  <strong>{failedBodyPairs.length}</strong>
                </p>
                <p>
                  Failed large-text pairs:{" "}
                  <strong>{failedLargePairs.length}</strong>
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
