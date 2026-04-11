"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
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

function IconActivity() {
  return (
    <Activity
      width={20}
      height={20}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

const SHEET_CARDS: {
  label: string;
  view: ProfileSheetView;
  icon: ReactNode;
  accent: "teal" | "orange";
}[] = [
  { label: "Stats", view: "stats", icon: <IconTrendingUp />, accent: "teal" },
  {
    label: "Flavour ranking",
    view: "flavours",
    icon: <IconTrophy />,
    accent: "orange",
  },
  { label: "Activity", view: "calendar", icon: <IconActivity />, accent: "teal" },
];

const CARD_STYLE: CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 14,
  boxShadow: "var(--shadow-card-sm)",
};

type ProfileGellogClientProps = {
  hasIceCreamPlus: boolean;
  stats: ProfileSheetStats;
  rankedFlavours: ProfileSheetRankedFlavour[];
  heatmapData: Record<string, HeatmapDayData>;
};

const cellClass =
  "flex min-h-[88px] flex-col items-center justify-center gap-2 px-1 py-3 text-center";

export function ProfileGellogClient({
  hasIceCreamPlus,
  stats,
  rankedFlavours,
  heatmapData,
}: ProfileGellogClientProps) {
  const [sheetView, setSheetView] = useState<ProfileSheetView | null>(null);

  return (
    <>
      <div
        className={`grid gap-2 ${hasIceCreamPlus ? "grid-cols-4" : "grid-cols-3"}`}
      >
        {SHEET_CARDS.map(({ label, view, icon, accent }) => (
          <button
            key={label}
            type="button"
            onClick={() => setSheetView(view)}
            className={cellClass}
            style={{
              ...CARD_STYLE,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                color:
                  accent === "teal" ? "var(--color-teal)" : "var(--color-orange)",
              }}
            >
              {icon}
            </span>
            <span
              style={{
                color: "var(--color-text-primary)",
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              {label}
            </span>
          </button>
        ))}
        {hasIceCreamPlus ? (
          <Link
            href="/icecream/passport"
            className={cellClass}
            style={{
              ...CARD_STYLE,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span style={{ color: "var(--color-orange)" }}>
              <IconGlobe />
            </span>
            <span
              style={{
                color: "var(--color-text-primary)",
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              Passport
            </span>
          </Link>
        ) : null}
      </div>

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
