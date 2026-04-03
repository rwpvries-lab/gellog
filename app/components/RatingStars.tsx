"use client";

import { useState } from "react";

type StarSize = "display-sm" | "display-lg" | "input";

type StarIconProps = {
  active: boolean;
  preview?: boolean;
  size: StarSize;
};

type StarRatingProps = {
  label?: string;
  /** When set with `label`, ids are stable for `aria-labelledby` (avoids useId SSR mismatches). */
  id?: string;
  value: number | null;
  onChange: (value: number) => void;
};

type RatingStarsDisplayProps = {
  value: number | null;
  size?: "sm" | "lg";
};

const STAR_VALUES = [1, 2, 3, 4, 5] as const;
const STAR_PATH =
  "M12 2.75l2.87 5.82 6.43.93-4.65 4.53 1.1 6.4L12 17.4l-5.75 3.03 1.1-6.4-4.65-4.53 6.43-.93L12 2.75z";

function getStarSizeClass(size: StarSize): string {
  if (size === "input") {
    return "h-6 w-6";
  }

  if (size === "display-lg") {
    return "h-6 w-6";
  }

  return "h-4 w-4 sm:h-5 sm:w-5";
}

function StarIcon({ active, preview = false, size }: StarIconProps) {
  const fillColor = active
    ? "var(--color-orange)"
    : preview
      ? "color-mix(in srgb, var(--color-orange) 45%, transparent)"
      : "transparent";

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={getStarSizeClass(size)}
    >
      <path
        d={STAR_PATH}
        fill={fillColor}
        stroke="var(--color-border)"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      {preview ? (
        <path
          d={STAR_PATH}
          fill="none"
          stroke="var(--color-orange)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

export function StarRating({ label, value, onChange, id }: StarRatingProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const labelId = id ? `${id}__label` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <span
          id={labelId}
          className="text-sm font-medium text-[color:var(--color-text-primary)]"
        >
          {label}
        </span>
      ) : null}
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-label={label && !labelId ? label : undefined}
        className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-surface-alt)] px-3 py-1 shadow-sm ring-1 ring-[color:var(--color-border)]"
      >
        {STAR_VALUES.map((star) => {
          const active = value != null && star <= value;
          const preview =
            hoveredValue != null &&
            star <= hoveredValue &&
            (value == null || star > value);

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoveredValue(star)}
              onMouseLeave={() => setHoveredValue(null)}
              onFocus={() => setHoveredValue(star)}
              onBlur={() => setHoveredValue(null)}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-orange)]"
            >
              <StarIcon active={active} preview={preview} size="input" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RatingStarsDisplay({
  value,
  size = "sm",
}: RatingStarsDisplayProps) {
  const safeValue = value ?? 0;
  const starSize = size === "lg" ? "display-lg" : "display-sm";

  return (
    <div
      aria-label={`${safeValue} out of 5 stars`}
      className="inline-flex items-center gap-0.5 rounded-full bg-[color:var(--color-surface-alt)] px-2 py-1 ring-1 ring-[color:var(--color-border)]"
    >
      {STAR_VALUES.map((star) => (
        <StarIcon
          key={star}
          active={star <= safeValue}
          size={starSize}
        />
      ))}
    </div>
  );
}
