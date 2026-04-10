"use client";

import { useState, type CSSProperties } from "react";
import {
  ProfileRollupSheet,
  type ProfileRollupFlavourRow,
  type ProfileRollupSalonRow,
  type ProfileRollupView,
} from "./ProfileRollupSheet";

type ProfileSummaryCardProps = {
  flavourCount: number;
  logCount: number;
  salonCount: number;
  flavoursRollup: ProfileRollupFlavourRow[];
  salonsRollup: ProfileRollupSalonRow[];
};

const CARD: CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 16,
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "1px solid var(--color-border)",
};

const DIVIDER: CSSProperties = {
  borderRight:
    "1px solid color-mix(in srgb, var(--color-text-primary) 10%, transparent)",
};

export function ProfileSummaryCard({
  flavourCount,
  logCount,
  salonCount,
  flavoursRollup,
  salonsRollup,
}: ProfileSummaryCardProps) {
  const [rollup, setRollup] = useState<ProfileRollupView>(null);

  function scrollToLogs() {
    document
      .getElementById("profile-your-logs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const cols: {
    value: number;
    label: string;
    action: "flavours" | "logs" | "salons";
  }[] = [
    { value: flavourCount, label: "Flavours", action: "flavours" },
    { value: logCount, label: "Logs", action: "logs" },
    { value: salonCount, label: "Salons", action: "salons" },
  ];

  return (
    <>
      <div className="px-1">
        <div className="grid grid-cols-3 gap-0 py-5" style={CARD}>
          {cols.map((col, i) => (
            <button
              key={col.label}
              type="button"
              onClick={() => {
                if (col.action === "logs") scrollToLogs();
                else setRollup(col.action);
              }}
              className="flex cursor-pointer flex-col items-center gap-0.5 px-2 transition-opacity hover:opacity-90 active:opacity-80"
              style={i < cols.length - 1 ? DIVIDER : undefined}
            >
              <span
                className="text-[26px] font-bold leading-none tabular-nums"
                style={{ color: "var(--color-teal)" }}
              >
                {col.value}
              </span>
              <span
                className="text-xs font-normal"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {col.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ProfileRollupSheet
        view={rollup}
        onClose={() => setRollup(null)}
        flavours={flavoursRollup}
        salons={salonsRollup}
      />
    </>
  );
}
