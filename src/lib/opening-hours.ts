export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type DayKey = (typeof DAYS)[number];

export type DayHours =
  | { closed: true; open?: never; close?: never }
  | { closed: false; open: string; close: string };

export type WeekHours = Record<DayKey, DayHours>;

type GooglePeriod = {
  open: { day: number; time: string };
  close?: { day: number; time: string };
};

const DAY_BY_INDEX: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function padTime(t: string): string {
  // "0900" → "09:00", already "09:00" → "09:00"
  const clean = t.replace(":", "");
  return `${clean.slice(0, 2)}:${clean.slice(2)}`;
}

export function googlePeriodsToWeekHours(periods: GooglePeriod[]): WeekHours {
  const map = new Map<DayKey, DayHours>();

  for (const period of periods) {
    const key = DAY_BY_INDEX[period.open.day];
    if (!key) continue;
    if (map.has(key)) continue; // one period per day

    if (!period.close) {
      // 24-hour open
      map.set(key, { closed: false, open: "00:00", close: "23:59" });
    } else {
      map.set(key, {
        closed: false,
        open: padTime(period.open.time),
        close: padTime(period.close.time),
      });
    }
  }

  const result = {} as WeekHours;
  for (const day of DAYS) {
    result[day] = map.get(day) ?? { closed: true };
  }
  return result;
}

export function isOpenNow(hours: WeekHours): boolean {
  const now = new Date();
  const key = DAY_BY_INDEX[now.getDay()];
  if (!key) return false;
  const today = hours[key];
  if (today.closed) return false;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const current = `${hh}:${mm}`;
  return current >= today.open && current < today.close;
}

export function todayKey(): DayKey {
  return DAY_BY_INDEX[new Date().getDay()] ?? "monday";
}

const TIME_RE = /^\d{2}:\d{2}$/;

export function validateWeekHours(raw: unknown): WeekHours | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const result = {} as WeekHours;

  for (const day of DAYS) {
    const v = obj[day];
    if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
    const d = v as Record<string, unknown>;

    if (d.closed === true) {
      result[day] = { closed: true };
    } else if (
      d.closed === false &&
      typeof d.open === "string" &&
      typeof d.close === "string" &&
      TIME_RE.test(d.open) &&
      TIME_RE.test(d.close)
    ) {
      result[day] = { closed: false, open: d.open, close: d.close };
    } else {
      return null;
    }
  }
  return result;
}

export function defaultWeekHours(): WeekHours {
  return {
    monday:    { closed: false, open: "10:00", close: "18:00" },
    tuesday:   { closed: false, open: "10:00", close: "18:00" },
    wednesday: { closed: false, open: "10:00", close: "18:00" },
    thursday:  { closed: false, open: "10:00", close: "18:00" },
    friday:    { closed: false, open: "10:00", close: "18:00" },
    saturday:  { closed: false, open: "10:00", close: "17:00" },
    sunday:    { closed: true },
  };
}
