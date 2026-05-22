import { PassportStamp } from '@/src/components/PassportStamp';
import Link from 'next/link';

export type CityStampWithEarned = {
  city_key: string;
  city_name: string;
  country: string;
  landmark_label: string | null;
  colour_primary: string | null;
  colour_secondary: string | null;
  earned: boolean;
  earned_at: string | null;
};

type Props = {
  stamps: CityStampWithEarned[];
};

function formatStampDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}·${mm}·${yy}`;
}

// Hairline L-shaped corner mark at each grid corner
function CornerMark({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = pos.startsWith('t');
  const left = pos.endsWith('l');
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: top ? 0 : undefined,
        bottom: top ? undefined : 0,
        left: left ? 0 : undefined,
        right: left ? undefined : 0,
        width: 10,
        height: 10,
        borderTop: top ? '1px solid rgba(168,85,48,0.45)' : undefined,
        borderBottom: top ? undefined : '1px solid rgba(168,85,48,0.45)',
        borderLeft: left ? '1px solid rgba(168,85,48,0.45)' : undefined,
        borderRight: left ? undefined : '1px solid rgba(168,85,48,0.45)',
      }}
    />
  );
}

export function ProfilePassportStrip({ stamps }: Props) {
  const earnedCount = stamps.filter((s) => s.earned).length;

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-base font-semibold text-[color:var(--text-primary)]">
          Passport
        </h2>
        {earnedCount > 0 ? (
          <Link
            href="/icecream/passport"
            className="text-xs font-medium text-[color:var(--brand-primary)] hover:underline"
          >
            {earnedCount} / {stamps.length} cities
          </Link>
        ) : (
          <span className="text-xs text-[color:var(--text-tertiary)]">
            Log gelato in a new city to earn stamps
          </span>
        )}
      </div>

      {/* 3×2 grid with hairline corner marks */}
      <div style={{ position: 'relative', padding: '14px 6px' }}>
        <CornerMark pos="tl" />
        <CornerMark pos="tr" />
        <CornerMark pos="bl" />
        <CornerMark pos="br" />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px 0',
            justifyItems: 'center',
          }}
        >
          {stamps.map((stamp, i) => (
            <div
              key={stamp.city_key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                // Alternate ±4° rotation — feels stamped, not arranged
                transform: `rotate(${i % 2 === 0 ? -4 : 4}deg)`,
              }}
            >
              <PassportStamp
                city_key={stamp.city_key}
                city_name={stamp.city_name}
                landmark_label={stamp.landmark_label}
                colour_primary={stamp.colour_primary}
                colour_secondary={stamp.colour_secondary}
                earned={stamp.earned}
                earned_at={stamp.earned_at}
                size="md"
              />
              <span
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                }}
              >
                {stamp.earned && stamp.earned_at ? formatStampDate(stamp.earned_at) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
