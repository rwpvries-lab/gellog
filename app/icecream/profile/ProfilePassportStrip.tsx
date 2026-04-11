import { Landmark } from "lucide-react";

type Stamp = { id: string; label: string };

type ProfilePassportStripProps = {
  stamps: Stamp[];
};

export function ProfilePassportStrip({ stamps }: ProfilePassportStripProps) {
  return (
    <section className="flex flex-col gap-3">
      <p
        style={{
          color: "var(--color-teal)",
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Passport
      </p>

      {stamps.length === 0 ? (
        <p
          className="rounded-2xl px-4 py-6 text-center text-sm"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          Your salon stamps will appear here as you log visits.
        </p>
      ) : (
        <div
          className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {stamps.map((stamp, index) => {
            const accentTeal = index % 2 === 0;
            return (
              <div
                key={stamp.id}
                className="flex w-[72px] shrink-0 flex-col items-center gap-2"
              >
                <div
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[color:var(--color-surface)] ring-1 ring-[color:var(--color-border)]"
                  style={{
                    border: `2px dashed ${accentTeal ? "var(--color-teal)" : "var(--color-orange)"}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <Landmark
                    className="h-7 w-7"
                    strokeWidth={1.5}
                    style={{
                      color: accentTeal ? "var(--color-teal)" : "var(--color-orange)",
                    }}
                    aria-hidden
                  />
                </div>
                <span
                  className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {stamp.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
