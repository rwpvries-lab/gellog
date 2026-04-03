"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  ProfileSheet,
  type ProfileSheetRankedFlavour,
  type ProfileSheetStats,
  type ProfileSheetView,
} from "./ProfileSheet";
import type { HeatmapDayData } from "./IceCreamHeatmap";

function IconTrendingUp() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

const GRID_CARDS: {
  label: string;
  view: ProfileSheetView;
  icon: ReactNode;
}[] = [
  { label: "Stats", view: "stats", icon: <IconTrendingUp /> },
  { label: "Flavour ranking", view: "flavours", icon: <IconTrophy /> },
  { label: "Passport", view: "passport", icon: <IconGlobe /> },
  { label: "Calendar", view: "calendar", icon: <IconCalendar /> },
];

const SECTION_LABEL_STYLE: React.CSSProperties = {
  color: "var(--color-text-secondary)",
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 600,
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 20,
};

type ProfileGellogClientProps = {
  stats: ProfileSheetStats;
  rankedFlavours: ProfileSheetRankedFlavour[];
  heatmapData: Record<string, HeatmapDayData>;
};

export function ProfileGellogClient({
  stats,
  rankedFlavours,
  heatmapData,
}: ProfileGellogClientProps) {
  const [sheetView, setSheetView] = useState<ProfileSheetView | null>(null);

  return (
    <>
      <section>
        <p style={SECTION_LABEL_STYLE} className="mb-3">
          Your Gellog
        </p>
        <div className="grid grid-cols-2 gap-3">
          {GRID_CARDS.map(({ label, view, icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setSheetView(view)}
              style={{
                ...CARD_STYLE,
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ color: "var(--color-orange)" }}>{icon}</span>
              <span
                style={{
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <ProfileSheet
        view={sheetView}
        onClose={() => setSheetView(null)}
        stats={stats}
        rankedFlavours={rankedFlavours}
        heatmapData={heatmapData}
      />
    </>
  );
}
