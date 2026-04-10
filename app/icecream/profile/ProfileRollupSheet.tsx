"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GellogClose } from "@/src/components/icons";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";

export type ProfileRollupView = "flavours" | "salons" | null;

export type ProfileRollupFlavourRow = {
  name: string;
  timesTried: number;
};

export type ProfileRollupSalonRow = {
  name: string;
  visitCount: number;
  lastVisitedIso: string;
  /** Google Places id when the user picked a real venue while logging — links to `/salon/[place_id]`. */
  placeId: string | null;
};

const SHEET_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SHEET_MS = 420;

const TITLES: Record<Exclude<ProfileRollupView, null>, string> = {
  flavours: "All flavours",
  salons: "All salons",
};

function subscribeHtmlClass(onChange: () => void): () => void {
  const el = document.documentElement;
  const obs = new MutationObserver(onChange);
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function getHtmlIsDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

function opaqueLayerStyle(hex: string): CSSProperties {
  return {
    backgroundColor: hex,
    backgroundImage: `linear-gradient(${hex}, ${hex})`,
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
    mixBlendMode: "normal",
    opacity: 1,
  };
}

type ProfileRollupSheetProps = {
  view: ProfileRollupView;
  onClose: () => void;
  flavours: ProfileRollupFlavourRow[];
  salons: ProfileRollupSalonRow[];
};

export function ProfileRollupSheet({
  view,
  onClose,
  flavours,
  salons,
}: ProfileRollupSheetProps) {
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

  const sheetTransform = entered
    ? `translate3d(0, ${dragY}px, 0)`
    : `translate3d(0, calc(100% + ${dragY}px), 0)`;

  const metaColor = isDark ? "#aeaeb2" : "#6b7280";
  const titleColor = isDark ? "#f9f9f9" : "#111827";

  const overlay = (
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: 10000 }}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 transition-opacity"
        style={{
          zIndex: 0,
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
            <p className="text-[17px] font-bold" style={{ color: titleColor }}>
              {TITLES[view]}
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
          {view === "flavours" ? (
            <div
              className="p-4"
              style={{
                ...opaqueLayerStyle(cardBg),
                border: `1px solid ${hairline}`,
                borderRadius: 20,
              }}
            >
              {flavours.length === 0 ? (
                <p className="text-sm" style={{ color: metaColor }}>
                  No flavours yet — add flavours when you log a visit.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {flavours.map((row) => (
                    <li
                      key={row.name}
                      className="flex items-center justify-between gap-3 border-t py-2.5 first:border-t-0 first:pt-0 last:pb-0"
                      style={{ borderColor: hairline }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: titleColor }}
                      >
                        {row.name}
                      </span>
                      <span className="text-sm tabular-nums" style={{ color: metaColor }}>
                        {row.timesTried}×
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div
              className="p-4"
              style={{
                ...opaqueLayerStyle(cardBg),
                border: `1px solid ${hairline}`,
                borderRadius: 20,
              }}
            >
              {salons.length === 0 ? (
                <p className="text-sm" style={{ color: metaColor }}>
                  No salons yet.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {salons.map((row) => {
                    const rowInner = (
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <span
                            className="block text-sm font-medium leading-snug"
                            style={{ color: titleColor }}
                          >
                            {row.name}
                          </span>
                          <span
                            className="mt-0.5 block text-xs leading-relaxed"
                            style={{ color: metaColor }}
                          >
                            {row.visitCount} visit{row.visitCount === 1 ? "" : "s"}
                            {" · "}
                            Last visit{" "}
                            {new Date(row.lastVisitedIso).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {/* Fixed slot so text lines up whether the row links to a salon or not */}
                        <div
                          className="flex h-5 w-5 shrink-0 items-center justify-center self-start pt-0.5"
                          aria-hidden
                        >
                          {row.placeId ? (
                            <ChevronRight
                              className="h-5 w-5"
                              style={{ color: "var(--color-text-tertiary)" }}
                              strokeWidth={2}
                            />
                          ) : null}
                        </div>
                      </div>
                    );

                    return (
                      <li
                        key={row.name}
                        className="border-t first:border-t-0 first:pt-0 last:pb-0"
                        style={{ borderColor: hairline }}
                      >
                        {row.placeId ? (
                          <Link
                            href={`/salon/${encodeURIComponent(row.placeId)}`}
                            className="-mx-1 flex flex-col gap-0.5 rounded-xl px-1 py-3 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            {rowInner}
                          </Link>
                        ) : (
                          <div className="flex flex-col gap-0.5 py-3">{rowInner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
