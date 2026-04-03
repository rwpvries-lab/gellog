"use client";

import { GellogClose } from "@/src/components/icons";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { IceCreamHeatmap, type HeatmapDayData } from "./IceCreamHeatmap";

export type ProfileSheetView = "stats" | "flavours" | "calendar" | "passport";

export type ProfileSheetStats = {
  totalAllTime: number;
  totalThisYear: number;
  averageOverallRating: number | null;
  mostVisitedSalon: { name: string; count: number } | null;
  bestWeather: string | null;
  totalSpent: number | null;
  averagePerVisit: number | null;
};

export type ProfileSheetRankedFlavour = {
  rank: number;
  name: string;
  timesTried: number;
  averageRating: number;
};

const SHEET_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SHEET_MS = 420;

function formatAverageRating(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)} ★`;
}

const VIEW_TITLES: Record<ProfileSheetView, string> = {
  stats: "Stats",
  flavours: "Flavour ranking",
  calendar: "Calendar",
  passport: "Passport",
};

/** iOS Safari: read theme from <html> class; portaled nodes + transforms often ignore Tailwind/CSS file fills. */
function subscribeHtmlClass(onChange: () => void): () => void {
  const el = document.documentElement;
  const obs = new MutationObserver(onChange);
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function getHtmlIsDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

function opaqueLayerStyle(hex: string): React.CSSProperties {
  return {
    backgroundColor: hex,
    /* WebKit sometimes drops plain background-color on promoted layers; gradient forces a fill. */
    backgroundImage: `linear-gradient(${hex}, ${hex})`,
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
    mixBlendMode: "normal",
    opacity: 1,
  };
}

type ProfileSheetProps = {
  view: ProfileSheetView | null;
  onClose: () => void;
  stats: ProfileSheetStats;
  rankedFlavours: ProfileSheetRankedFlavour[];
  heatmapData: Record<string, HeatmapDayData>;
};

export function ProfileSheet({
  view,
  onClose,
  stats,
  rankedFlavours,
  heatmapData,
}: ProfileSheetProps) {
  const [entered, setEntered] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const dragging = useRef(false);
  const userRequestedClose = useRef(false);
  const closeFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDark = useSyncExternalStore(subscribeHtmlClass, getHtmlIsDark, () => false);
  const shellBg = isDark ? "#2c2c2e" : "#f4f4f5";
  const cardBg = isDark ? "#1c1c1e" : "#f9f9f9";
  const hairline = isDark ? "#3a3a3c" : "#e5e7eb";

  useEffect(() => {
    if (view === null) {
      setEntered(false);
      setDragY(0);
      return;
    }
    userRequestedClose.current = false;
    if (closeFallbackTimer.current) {
      clearTimeout(closeFallbackTimer.current);
      closeFallbackTimer.current = null;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [view]);

  useEffect(() => {
    if (view === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [view]);

  useEffect(() => {
    return () => {
      if (closeFallbackTimer.current) {
        clearTimeout(closeFallbackTimer.current);
        closeFallbackTimer.current = null;
      }
    };
  }, []);

  const requestClose = useCallback(() => {
    userRequestedClose.current = true;
    setEntered(false);
    setDragY(0);
    if (closeFallbackTimer.current) clearTimeout(closeFallbackTimer.current);
    closeFallbackTimer.current = setTimeout(() => {
      closeFallbackTimer.current = null;
      if (!userRequestedClose.current) return;
      userRequestedClose.current = false;
      onClose();
    }, SHEET_MS + 120);
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && view !== null) requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, requestClose]);

  function handleSheetTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.propertyName !== "transform") return;
    if (!userRequestedClose.current) return;
    userRequestedClose.current = false;
    if (closeFallbackTimer.current) {
      clearTimeout(closeFallbackTimer.current);
      closeFallbackTimer.current = null;
    }
    onClose();
  }

  function onHandleTouchStart(e: React.TouchEvent) {
    dragging.current = true;
    dragStartY.current = e.touches[0].clientY;
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const y = e.touches[0].clientY;
    const dy = Math.max(0, y - dragStartY.current);
    setDragY(dy);
  }

  function onHandleTouchEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > 72) {
      requestClose();
    } else {
      setDragY(0);
    }
  }

  if (view === null) return null;

  /* translate3d keeps iOS GPU layers consistent with opaque fills */
  const sheetTransform = entered
    ? `translate3d(0, ${dragY}px, 0)`
    : `translate3d(0, calc(100% + ${dragY}px), 0)`;

  /* Portal to body: avoids iOS/WebKit stacking bugs where fixed UI inside the page
   * tree paints under later siblings (e.g. the feed) and odd backdrop rendering. */
  const overlay = (
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: 9999 }}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 transition-opacity"
        style={{
          zIndex: 0,
          /* Explicit rgba: Tailwind bg-black/45 can look invisible on some mobile WebKit builds. */
          backgroundColor: "rgba(0, 0, 0, 0.52)",
          opacity: entered ? 1 : 0,
          transitionDuration: `${SHEET_MS}ms`,
          transitionTimingFunction: SHEET_EASE,
        }}
        onClick={requestClose}
      />

      <div
        className="relative z-10 mt-auto flex max-h-[min(92dvh,900px)] w-full flex-col overflow-hidden rounded-t-[24px] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.45)]"
        style={{
          ...opaqueLayerStyle(shellBg),
          transform: sheetTransform,
          transitionProperty: entered && dragY === 0 ? "transform" : "none",
          transitionDuration: `${SHEET_MS}ms`,
          transitionTimingFunction: SHEET_EASE,
        }}
        onTransitionEnd={handleSheetTransitionEnd}
      >
        <div
          className="flex flex-shrink-0 flex-col items-center px-4 pb-3 pt-2"
          style={{
            ...opaqueLayerStyle(shellBg),
            borderBottom: `1px solid ${hairline}`,
          }}
        >
          <div
            className="mb-2 flex w-full justify-center py-2"
            onTouchStart={onHandleTouchStart}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
            onTouchCancel={onHandleTouchEnd}
          >
            <div
              className="h-1 w-10 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600"
              aria-hidden
            />
          </div>
          <div className="flex w-full items-center justify-between gap-3">
            <p
              className="text-[17px] font-bold"
              style={{ color: isDark ? "#f9f9f9" : "#111827" }}
            >
              {VIEW_TITLES[view]}
            </p>
            <button
              type="button"
              aria-label="Close"
              onClick={requestClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <GellogClose size={22} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4"
          style={{
            ...opaqueLayerStyle(shellBg),
            paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          {view === "stats" ? (
            <StatsBody stats={stats} cardBg={cardBg} hairline={hairline} isDark={isDark} />
          ) : null}
          {view === "flavours" ? (
            <FlavoursBody
              rankedFlavours={rankedFlavours}
              cardBg={cardBg}
              hairline={hairline}
              isDark={isDark}
            />
          ) : null}
          {view === "calendar" ? (
            <div
              className="p-4"
              style={{
                ...opaqueLayerStyle(cardBg),
                border: `1px solid ${hairline}`,
                borderRadius: 20,
              }}
            >
              <IceCreamHeatmap data={heatmapData} />
            </div>
          ) : null}
          {view === "passport" ? (
            <PassportBody cardBg={cardBg} hairline={hairline} isDark={isDark} />
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

function StatsBody({
  stats,
  cardBg,
  hairline,
  isDark,
}: {
  stats: ProfileSheetStats;
  cardBg: string;
  hairline: string;
  isDark: boolean;
}) {
  const {
    totalAllTime,
    totalThisYear,
    averageOverallRating,
    mostVisitedSalon,
    bestWeather,
    totalSpent,
    averagePerVisit,
  } = stats;

  const rows: { label: string; value: string }[] = [
    { label: "Total scoops", value: String(totalAllTime) },
    { label: "This year", value: String(totalThisYear) },
    {
      label: "Average rating",
      value: formatAverageRating(averageOverallRating),
    },
    {
      label: "Most visited salon",
      value: mostVisitedSalon
        ? `${mostVisitedSalon.name} (${mostVisitedSalon.count}×)`
        : "—",
    },
    { label: "Best weather", value: bestWeather ?? "—" },
  ];

  if (totalSpent != null) {
    rows.push({ label: "Total spent", value: `€${totalSpent.toFixed(2)}` });
  }
  if (averagePerVisit != null) {
    rows.push({
      label: "Avg per visit",
      value: `€${averagePerVisit.toFixed(2)}`,
    });
  }

  return (
    <div
      className="p-4"
      style={{
        ...opaqueLayerStyle(cardBg),
        border: `1px solid ${hairline}`,
        borderRadius: 20,
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        {rows.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5">
            <p className="text-xs" style={{ color: isDark ? "#aeaeb2" : "#6b7280" }}>
              {stat.label}
            </p>
            <p
              className="truncate text-base font-semibold"
              style={{ color: isDark ? "#f9f9f9" : "#111827" }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlavoursBody({
  rankedFlavours,
  cardBg,
  hairline,
  isDark,
}: {
  rankedFlavours: ProfileSheetRankedFlavour[];
  cardBg: string;
  hairline: string;
  isDark: boolean;
}) {
  return (
    <div
      className="p-4"
      style={{
        ...opaqueLayerStyle(cardBg),
        border: `1px solid ${hairline}`,
        borderRadius: 20,
      }}
    >
      {rankedFlavours.length === 0 ? (
        <p className="text-sm" style={{ color: isDark ? "#aeaeb2" : "#6b7280" }}>
          Keep logging — flavours appear here once you&apos;ve tried them at
          least twice.
        </p>
      ) : (
        <ul className="flex flex-col">
          {rankedFlavours.map((flavour) => (
            <li
              key={flavour.name}
              className="flex items-center justify-between gap-3 border-t py-2.5 first:border-t-0 first:pt-0 last:pb-0"
              style={{ borderColor: hairline }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white">
                  #{flavour.rank}
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-sm font-medium"
                    style={{ color: isDark ? "#f9f9f9" : "#111827" }}
                  >
                    {flavour.name}
                  </span>
                  <span className="text-xs" style={{ color: isDark ? "#aeaeb2" : "#6b7280" }}>
                    {flavour.timesTried} scoop
                    {flavour.timesTried === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: isDark ? "#fb923c" : "#ea580c" }}
              >
                {flavour.averageRating.toFixed(1)} ★
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PassportBody({
  cardBg,
  hairline,
  isDark,
}: {
  cardBg: string;
  hairline: string;
  isDark: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-4 p-5 text-center"
      style={{
        ...opaqueLayerStyle(cardBg),
        border: `1px solid ${hairline}`,
        borderRadius: 20,
      }}
    >
      <p className="text-[15px]" style={{ color: isDark ? "#aeaeb2" : "#6b7280" }}>
        Your ice-cream passport lives on the map — discover salons, see where
        you&apos;ve been, and find new spots.
      </p>
      <Link
        href="/map"
        className="rounded-2xl bg-teal-500 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-teal-600"
      >
        Open map
      </Link>
    </div>
  );
}
