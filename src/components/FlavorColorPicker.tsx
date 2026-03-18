"use client";

import { useEffect, useRef } from "react";

const PRESET_COLOURS = [
  { hex: "#A8C5A0", label: "Pistachio" },
  { hex: "#F4A7B9", label: "Strawberry" },
  { hex: "#7B5E3A", label: "Chocolate" },
  { hex: "#F5E6C8", label: "Vanilla" },
  { hex: "#F4E04D", label: "Lemon" },
  { hex: "#5B7EC0", label: "Blueberry" },
  { hex: "#FFA94D", label: "Mango" },
  { hex: "#A8E6CF", label: "Mint" },
  { hex: "#C49A6C", label: "Hazelnut" },
  { hex: "#E05A7A", label: "Raspberry" },
  { hex: "#D4A5A5", label: "Caramel" },
  { hex: "#B5D5E8", label: "Bubblegum" },
];

type Neighbour = { hex: string; label: string };

type Props = {
  value: string | null;
  onChange: (hex: string) => void;
  onClose?: () => void;
  flavorName: string;
  allFlavours?: Neighbour[];
  activeIndex?: number;
};

export function FlavorColorPicker({
  value,
  onChange,
  onClose,
  flavorName,
  allFlavours,
  activeIndex,
}: Props) {
  const customInputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const currentHex = value ?? PRESET_COLOURS[0].hex;
  const matchedPreset = PRESET_COLOURS.find(
    (p) => p.hex.toLowerCase() === currentHex.toLowerCase(),
  );
  const isCustom = !matchedPreset;
  const selectedLabel = matchedPreset?.label ?? "Custom";

  // Scroll the active tub into view when the picker opens
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
  }, []);

  return (
    <div className="w-full max-w-[360px] rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/60">

      {/* ── Header preview ─────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="h-9 w-9 flex-shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: currentHex }}
        />
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {selectedLabel}
          </p>
          <p className="font-mono text-xs uppercase text-zinc-400 dark:text-zinc-500">
            {currentHex}
          </p>
        </div>
      </div>

      {/* ── Swatch grid ────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-6 gap-2">
        {PRESET_COLOURS.map((c) => {
          const isSelected = currentHex.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              onClick={() => onChange(c.hex)}
              className="h-11 w-11 rounded-full shadow-sm transition active:scale-90"
              style={{
                backgroundColor: c.hex,
                outline: isSelected ? `2.5px solid ${c.hex}` : "none",
                outlineOffset: isSelected ? "3px" : "0",
              }}
            />
          );
        })}

        {/* Custom swatch — 13th slot */}
        <div className="relative h-11 w-11">
          <div
            className="pointer-events-none flex h-11 w-11 items-center justify-center rounded-full shadow-sm"
            style={{
              backgroundColor: isCustom ? currentHex : "transparent",
              border: isCustom ? "none" : "2px dashed #a1a1aa",
              outline: isCustom ? `2.5px solid ${currentHex}` : "none",
              outlineOffset: "3px",
            }}
          >
            {!isCustom && (
              <span className="text-lg leading-none text-zinc-400 dark:text-zinc-500">
                +
              </span>
            )}
          </div>
          <input
            ref={customInputRef}
            type="color"
            value={currentHex}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
            title="Custom colour"
          />
        </div>
      </div>

      {/* ── Vitrine preview ─────────────────────────────────── */}
      {allFlavours && allFlavours.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <div className="flex items-end gap-1.5 pb-1">
            {allFlavours.map((f, i) => {
              const isActive = i === activeIndex;
              return (
                <div
                  key={i}
                  ref={isActive ? activeRef : undefined}
                  className="flex flex-shrink-0 flex-col items-center gap-1"
                >
                  <div
                    className={`h-8 w-10 rounded-t-lg transition-colors duration-100 ${
                      isActive
                        ? "ring-2 ring-black/20 ring-offset-1"
                        : "opacity-50"
                    }`}
                    style={{ backgroundColor: isActive ? currentHex : f.hex }}
                  />
                  <span
                    className={`max-w-[40px] truncate text-center text-[10px] ${
                      isActive
                        ? "font-medium text-zinc-700 dark:text-zinc-200"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {isActive ? (flavorName || f.label) : f.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Done button ─────────────────────────────────────── */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-teal-600 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-[.98]"
        >
          Done
        </button>
      )}
    </div>
  );
}
