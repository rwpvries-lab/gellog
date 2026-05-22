import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { AppShell } from "@/app/components/AppShell";
import { PassportStamp } from "@/src/components/PassportStamp";

function formatStampDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}·${mm}·${yy}`;
}

function CornerMark({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const top = pos.startsWith("t");
  const left = pos.endsWith("l");
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: top ? 0 : undefined,
        bottom: top ? undefined : 0,
        left: left ? 0 : undefined,
        right: left ? undefined : 0,
        width: 10,
        height: 10,
        borderTop: top ? "1px solid rgba(168,85,48,0.45)" : undefined,
        borderBottom: top ? undefined : "1px solid rgba(168,85,48,0.45)",
        borderLeft: left ? "1px solid rgba(168,85,48,0.45)" : undefined,
        borderRight: left ? undefined : "1px solid rgba(168,85,48,0.45)",
      }}
    />
  );
}

export default async function IceCreamPassportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/icecream/passport");
  }

  const [{ data: cityStampsData }, { data: userStampsData }] = await Promise.all([
    supabase
      .from("city_stamps")
      .select("city_key, city_name, country, landmark_label, colour_primary, colour_secondary")
      .order("city_name"),
    supabase
      .from("user_stamps")
      .select("city_key, earned_at")
      .eq("user_id", user.id),
  ]);

  const earnedKeys = new Set((userStampsData ?? []).map((s) => s.city_key));
  const earnedAtMap = new Map(
    (userStampsData ?? []).map((s) => [s.city_key, s.earned_at as string]),
  );

  const stamps = (cityStampsData ?? []).map((cs) => ({
    ...cs,
    earned: earnedKeys.has(cs.city_key),
    earned_at: earnedAtMap.get(cs.city_key) ?? null,
  }));

  const earnedCount = stamps.filter((s) => s.earned).length;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-2xl font-semibold text-[color:var(--text-primary)]">
            Passport
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)]">
            {earnedCount === 0
              ? "Log gelato in a new city to earn your first stamp."
              : earnedCount === stamps.length
              ? `All ${stamps.length} cities visited — incredible!`
              : `${earnedCount} of ${stamps.length} cities visited`}
          </p>
        </div>

        {/* 3×2 stamp grid */}
        <div style={{ position: "relative", padding: "14px 6px" }}>
          <CornerMark pos="tl" />
          <CornerMark pos="tr" />
          <CornerMark pos="bl" />
          <CornerMark pos="br" />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "28px 0",
              justifyItems: "center",
            }}
          >
            {stamps.map((stamp, i) => (
              <div
                key={stamp.city_key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
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
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--text-tertiary)",
                    textAlign: "center",
                  }}
                >
                  {stamp.earned && stamp.earned_at ? formatStampDate(stamp.earned_at) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Earned detail list */}
        {earnedCount > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-widest text-[color:var(--text-tertiary)]">
              Visited
            </p>
            {stamps
              .filter((s) => s.earned)
              .map((stamp) => (
                <div
                  key={stamp.city_key}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--surface-elevated)] px-4 py-3 shadow-[var(--shadow-card-sm)]"
                >
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: stamp.colour_primary ?? "#A85530" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm font-semibold text-[color:var(--text-primary)]">
                      {stamp.city_name}
                    </p>
                    {stamp.landmark_label && (
                      <p className="text-xs text-[color:var(--text-secondary)]">
                        {stamp.landmark_label} · {stamp.country}
                      </p>
                    )}
                  </div>
                  {stamp.earned_at && (
                    <p className="flex-shrink-0 text-xs text-[color:var(--text-tertiary)]">
                      {new Date(stamp.earned_at).toLocaleDateString("en", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}

        {earnedCount === 0 && (
          <Link
            href="/icecream/logs/new"
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-6 py-3 text-sm font-semibold text-[color:var(--text-inverse)] transition hover:bg-[color:var(--brand-primary-hover)]"
          >
            Log your first gelato →
          </Link>
        )}
      </div>
    </AppShell>
  );
}
