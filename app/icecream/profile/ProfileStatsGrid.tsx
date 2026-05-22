import { MapPin, Flame, Cone } from "lucide-react";
import { BASE_TOKENS } from "@/src/lib/gelato-tokens";

export type TopFlavour = {
  name: string;
  baseToken: string | null;
};

type ProfileStatsGridProps = {
  totalVisits: number;
  avgRating: number | null;
  citiesCount: number;
  uniqueCanonicalFlavourCount: number;
  topFlavour: TopFlavour | null;
  currentStreak: number;
};

const CARD: React.CSSProperties = {
  background: "var(--color-surface-alt)",
  borderRadius: 14,
  border: "1px solid var(--color-border)",
  boxShadow: "var(--shadow-card-sm)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "16px 8px",
  textAlign: "center",
};

const NUM: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 26,
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--color-text-primary)",
};

const LABEL: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  lineHeight: 1.2,
};

const ICON_COLOR = "var(--color-primary)";

function flavourDotColor(baseToken: string | null): string {
  if (!baseToken) return "#C9986A";
  const entry = BASE_TOKENS[baseToken as keyof typeof BASE_TOKENS];
  return entry?.hex ?? "#C9986A";
}

export function ProfileStatsGrid({
  totalVisits,
  avgRating,
  citiesCount,
  uniqueCanonicalFlavourCount,
  topFlavour,
  currentStreak,
}: ProfileStatsGridProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Summary row */}
      <div
        className="flex items-center justify-center gap-3"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--color-text-secondary)",
        }}
      >
        <span>
          <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
            {totalVisits}
          </span>{" "}
          {totalVisits === 1 ? "visit" : "visits"}
        </span>
        {avgRating != null && (
          <>
            <span style={{ opacity: 0.35 }}>·</span>
            <span>
              <span
                style={{ fontWeight: 700, color: "var(--color-text-primary)" }}
              >
                ⭐ {avgRating.toFixed(1)}
              </span>{" "}
              avg rating
            </span>
          </>
        )}
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Cities visited */}
        <div style={CARD}>
          <MapPin
            size={20}
            strokeWidth={2}
            style={{ color: ICON_COLOR }}
            aria-hidden
          />
          <span style={NUM}>{citiesCount}</span>
          <span style={LABEL}>{citiesCount === 1 ? "city" : "cities"}</span>
        </div>

        {/* Unique flavours tried */}
        <div style={CARD}>
          <Cone
            size={20}
            strokeWidth={2}
            style={{ color: ICON_COLOR, transform: "rotate(180deg)" }}
            aria-hidden
          />
          <span style={NUM}>{uniqueCanonicalFlavourCount}</span>
          <span style={LABEL}>
            {uniqueCanonicalFlavourCount === 1 ? "flavour tried" : "flavours tried"}
          </span>
        </div>

        {/* Top flavour */}
        <div style={CARD}>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: flavourDotColor(topFlavour?.baseToken ?? null),
              border: "1.5px solid rgba(0,0,0,0.08)",
              flexShrink: 0,
              display: "inline-block",
            }}
            aria-hidden
          />
          <span
            style={{
              ...NUM,
              fontSize: topFlavour ? (topFlavour.name.length > 10 ? 14 : 18) : 26,
              lineHeight: 1.2,
            }}
          >
            {topFlavour?.name ?? "—"}
          </span>
          <span style={LABEL}>top flavour</span>
        </div>

        {/* Streak */}
        <div style={CARD}>
          <Flame
            size={20}
            strokeWidth={2}
            style={{ color: currentStreak > 0 ? ICON_COLOR : "var(--color-text-secondary)" }}
            aria-hidden
          />
          <span style={NUM}>{currentStreak}</span>
          <span style={LABEL}>{currentStreak === 1 ? "day streak" : "day streak"}</span>
        </div>
      </div>
    </div>
  );
}
