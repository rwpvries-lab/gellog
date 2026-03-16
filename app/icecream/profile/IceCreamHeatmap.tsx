'use client';

import { useEffect, useRef, useState } from 'react';

export type HeatmapDayData = {
  count: number;
  salons: string[];
};

type IceCreamHeatmapProps = {
  data: Record<string, HeatmapDayData>;
};

const CELL = 14;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT_LABEL_WIDTH = 22;

const WEEKDAY_LABELS = ['M', '', 'W', '', 'F', '', ''];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LEGEND = [
  { label: 'No logs', className: 'bg-zinc-100 dark:bg-zinc-800' },
  { label: '1', className: 'bg-teal-100 dark:bg-teal-900/70' },
  { label: '2', className: 'bg-teal-300 dark:bg-teal-600' },
  { label: '3+', className: 'bg-teal-600 dark:bg-teal-400' },
];

function cellColorClass(count: number): string {
  if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800';
  if (count === 1) return 'bg-teal-100 dark:bg-teal-900/70';
  if (count === 2) return 'bg-teal-300 dark:bg-teal-600';
  return 'bg-teal-600 dark:bg-teal-400';
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

export function IceCreamHeatmap({ data }: IceCreamHeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Hover tooltip — desktop only (mouseenter/leave)
  const [hoverTooltip, setHoverTooltip] = useState<{ dateStr: string; rect: DOMRect } | null>(null);
  // Selected day — driven by click/tap, shows inline panel
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  // Dismiss selected panel on outside click
  useEffect(() => {
    if (!selected) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-heatmap]')) {
        setSelected(null);
      }
    };
    window.addEventListener('click', handler, { capture: true });
    return () => window.removeEventListener('click', handler, { capture: true });
  }, [selected]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const startMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Align grid start to Monday
  const startDow = startMonth.getDay();
  const daysBack = startDow === 0 ? 6 : startDow - 1;
  const gridStart = new Date(startMonth);
  gridStart.setDate(gridStart.getDate() - daysBack);

  // Align grid end to Sunday
  const endDow = endMonth.getDay();
  const daysForward = endDow === 0 ? 0 : 7 - endDow;
  const gridEnd = new Date(endMonth);
  gridEnd.setDate(gridEnd.getDate() + daysForward);

  // Build weeks (Mon–Sun columns)
  const weeks: Date[][] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month label positions
  const monthLabels: { label: string; weekIdx: number }[] = [];
  const seenMonths = new Set<string>();
  weeks.forEach((week, wIdx) => {
    for (const day of week) {
      if (day < startMonth || day > endMonth) continue;
      const key = `${day.getFullYear()}-${day.getMonth()}`;
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        const isJan = day.getMonth() === 0;
        const label = MONTHS[day.getMonth()] + (isJan ? ` '${String(day.getFullYear()).slice(2)}` : '');
        monthLabels.push({ label, weekIdx: wIdx });
      }
    }
  });

  // Total scoops within the 12-month range
  const totalInRange = Object.entries(data).reduce((sum, [dateStr, d]) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date >= startMonth && date <= endMonth ? sum + d.count : sum;
  }, 0);

  const totalWidth = weeks.length * STEP - GAP;

  const selectedData = selected ? data[selected] : null;
  const selectedCount = selectedData?.count ?? 0;

  return (
    <div className="flex flex-col gap-3" data-heatmap>
      {/* Summary pill */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60">
          <span>🍦</span>
          {totalInRange} scoop{totalInRange !== 1 ? 's' : ''} in the last 12 months
        </span>
      </div>

      {/* Grid */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-1"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div style={{ width: LEFT_LABEL_WIDTH + totalWidth + 'px', position: 'relative' }}>
          {/* Month labels */}
          <div style={{ marginLeft: LEFT_LABEL_WIDTH, height: 18, position: 'relative', marginBottom: 4 }}>
            {monthLabels.map(({ label, weekIdx }) => (
              <span
                key={label + weekIdx}
                style={{ position: 'absolute', left: weekIdx * STEP, fontSize: 11, lineHeight: '18px', whiteSpace: 'nowrap' }}
                className="font-medium text-zinc-400 dark:text-zinc-500"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Weekday labels + week columns */}
          <div style={{ display: 'flex' }}>
            <div style={{ width: LEFT_LABEL_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: GAP }}>
              {WEEKDAY_LABELS.map((lbl, i) => (
                <div
                  key={i}
                  style={{ height: CELL, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 5 }}
                  className="font-medium text-zinc-400 dark:text-zinc-500"
                >
                  {lbl}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: GAP }}>
              {weeks.map((week, wIdx) => (
                <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {week.map((day, dIdx) => {
                    const dateStr = toDateStr(day);
                    const dayData = data[dateStr];
                    const count = dayData?.count ?? 0;
                    const isOutOfRange = day < startMonth || day > endMonth;
                    const isFuture = day > today;
                    const invisible = isOutOfRange || isFuture;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selected;

                    const ringClass = invisible
                      ? ''
                      : isToday
                        ? 'ring-2 ring-orange-400 ring-offset-1 dark:ring-orange-500 dark:ring-offset-zinc-900'
                        : isSelected
                          ? 'ring-2 ring-teal-500 ring-offset-1 dark:ring-teal-400 dark:ring-offset-zinc-900'
                          : '';

                    return (
                      <div
                        key={dIdx}
                        style={{ width: CELL, height: CELL, borderRadius: 4, flexShrink: 0 }}
                        className={[invisible ? '' : cellColorClass(count), ringClass].filter(Boolean).join(' ')}
                        onMouseEnter={(e) => {
                          if (invisible) return;
                          setHoverTooltip({ dateStr, rect: e.currentTarget.getBoundingClientRect() });
                        }}
                        onMouseLeave={() => setHoverTooltip(null)}
                        onClick={(e) => {
                          if (invisible) return;
                          e.stopPropagation();
                          setHoverTooltip(null);
                          setSelected((prev) => (prev === dateStr ? null : dateStr));
                        }}
                        role={invisible ? undefined : 'button'}
                        tabIndex={invisible ? undefined : 0}
                        aria-label={invisible ? undefined : `${dateStr}: ${count} log${count !== 1 ? 's' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inline info panel (tap/click) */}
      {selected !== null && (
        <div className="rounded-2xl bg-teal-50 px-4 py-3 ring-1 ring-teal-100 dark:bg-teal-900/20 dark:ring-teal-800/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {formatDateLabel(selected)}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                🍦 {selectedCount} scoop{selectedCount !== 1 ? 's' : ''}
              </p>
              {selectedData?.salons.map((salon, i) => (
                <p key={i} className="text-xs text-zinc-500 dark:text-zinc-400">
                  {salon}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] text-teal-600 transition hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-800/60"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3">
        {LEGEND.map(({ label, className }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div style={{ width: CELL, height: CELL, borderRadius: 4, flexShrink: 0 }} className={className} />
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Hover tooltip (desktop) */}
      {hoverTooltip &&
        (() => {
          const tooltipData = data[hoverTooltip.dateStr];
          const count = tooltipData?.count ?? 0;
          return (
            <div
              style={{
                position: 'fixed',
                ...(hoverTooltip.rect.left + 200 > window.innerWidth
                  ? { right: window.innerWidth - hoverTooltip.rect.right }
                  : { left: hoverTooltip.rect.left }),
                top: hoverTooltip.rect.top - 10,
                transform: 'translateY(-100%)',
                maxWidth: 'min(200px, 90vw)',
                zIndex: 50,
                pointerEvents: 'none',
              }}
              className="rounded-2xl bg-white px-3.5 py-2.5 shadow-lg ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-700"
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {formatDateLabel(hoverTooltip.dateStr)}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                🍦 {count} scoop{count !== 1 ? 's' : ''}
              </p>
              {tooltipData?.salons.slice(0, 3).map((salon, i) => (
                <p key={i} className="max-w-[180px] truncate text-xs text-zinc-400 dark:text-zinc-500">
                  {salon}
                </p>
              ))}
            </div>
          );
        })()}
    </div>
  );
}
