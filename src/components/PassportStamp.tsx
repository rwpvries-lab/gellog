'use client';

import { useEffect, useState } from 'react';

type Size = 'sm' | 'md' | 'lg';

const DIMS: Record<Size, number> = {
  sm: 72,
  md: 100,
  lg: 128,
};

type Props = {
  city_key: string;
  city_name: string;
  landmark_label?: string | null;
  colour_primary?: string | null;
  colour_secondary?: string | null;
  earned: boolean;
  earned_at?: string | null;
  size?: Size;
};

// ─── Shared SVG artwork ────────────────────────────────────────────────────────
// Anatomy: outer 2.8px ring (r=46) + inner 1.2px ring (r=36).
// City name text runs in the annular band between them via a top-arc textPath (r=41).
// Landmark + ✦ glyph sit inside the inner ring.

function StampArtwork({
  id,
  city_name,
  landmark_label,
  colour_primary,
}: {
  id: string;
  city_name: string;
  landmark_label?: string | null;
  colour_primary?: string | null;
}) {
  const color = colour_primary ?? '#A85530';

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
    >
      <defs>
        {/* Top-arc path at r=41 for city name (midpoint of the ring band) */}
        <path id={`arc-${id}`} d="M 50,50 m -41,0 a 41,41 0 0,1 82,0" />
      </defs>

      {/* Background fill — sits inside the outer ring stroke */}
      <circle cx="50" cy="50" r="44.6" fill={color} />

      {/* Outer ring — 2.8px stroke */}
      <circle
        cx="50" cy="50" r="46"
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="2.8"
      />

      {/* Inner ring — 1.2px stroke */}
      <circle
        cx="50" cy="50" r="36"
        fill="none"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.2"
      />

      {/* City name — curved in the band, centred at the top */}
      <text
        fontFamily="var(--font-fraunces, Georgia, serif)"
        fontSize="8"
        fontWeight="700"
        letterSpacing="2.2"
        fill="rgba(255,255,255,0.95)"
      >
        <textPath href={`#arc-${id}`} startOffset="50%" textAnchor="middle">
          {city_name.toUpperCase()}
        </textPath>
      </text>

      {/* Centre glyph */}
      <text
        x="50" y="55"
        textAnchor="middle"
        fontSize="20"
        fill="rgba(255,255,255,0.85)"
      >
        ✦
      </text>

      {/* Landmark label — inside inner ring, below glyph */}
      {landmark_label && (
        <text
          x="50" y="70"
          textAnchor="middle"
          fontFamily="var(--font-fraunces, Georgia, serif)"
          fontSize="6"
          letterSpacing="1.2"
          fill="rgba(255,255,255,0.62)"
        >
          {landmark_label.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

// ─── Lock overlay ──────────────────────────────────────────────────────────────
// Renders dashed outer + inner ring and a lock icon.
// Composited on top of the ghost artwork for locked stamps.

function LockOverlay() {
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dashed outer ring */}
      <circle
        cx="50" cy="50" r="46"
        fill="none"
        stroke="rgba(168,85,48,0.55)"
        strokeWidth="1.6"
        strokeDasharray="4 3"
      />
      {/* Dashed inner ring */}
      <circle
        cx="50" cy="50" r="36"
        fill="none"
        stroke="rgba(168,85,48,0.35)"
        strokeWidth="1"
        strokeDasharray="3 2"
      />
      {/* Lock body */}
      <rect x="37" y="49" width="26" height="18" rx="3" fill="rgba(168,85,48,0.65)" />
      {/* Lock shackle */}
      <path
        d="M 42,49 V 40.5 a 8,8 0 0 1 16,0 V 49"
        stroke="rgba(168,85,48,0.65)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <circle cx="50" cy="57.5" r="2.8" fill="rgba(251,245,232,0.8)" />
    </svg>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

export function PassportStamp({
  city_key,
  city_name,
  landmark_label,
  colour_primary,
  earned,
  size = 'md',
}: Props) {
  const dim = DIMS[size];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        width: dim,
        height: dim,
        position: 'relative',
        flexShrink: 0,
        animation: earned && mounted ? 'stampIn 0.4s ease-out backwards' : undefined,
      }}
      title={!earned ? `Visit ${city_name} to unlock` : undefined}
    >
      {earned ? (
        <StampArtwork
          id={city_key}
          city_name={city_name}
          landmark_label={landmark_label}
          colour_primary={colour_primary}
        />
      ) : (
        <>
          {/* Ghost artwork — full colour stamp tinted very faint */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              filter: 'grayscale(1)',
              opacity: 0.18,
            }}
          >
            <StampArtwork
              id={`${city_key}-ghost`}
              city_name={city_name}
              landmark_label={landmark_label}
              colour_primary="none"
            />
          </div>

          {/* Dashed rings + lock on top */}
          <LockOverlay />
        </>
      )}
    </div>
  );
}
