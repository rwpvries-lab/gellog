import type { PeakGridPayload } from "@/src/lib/salonPeakGrid";

type Props = {
  peak: PeakGridPayload;
};

// 5 discrete bands (0=lowest → 4=highest). Returns inline style background colour.
function cellColor(score: number): string {
  if (score <= 20) return "rgba(168,85,48,0.08)";
  if (score <= 40) return "rgba(168,85,48,0.24)";
  if (score <= 60) return "rgba(168,85,48,0.44)";
  if (score <= 80) return "rgba(168,85,48,0.65)";
  return "#A85530";
}

function todayGridRow(): number {
  // JS getDay(): 0=Sun … 6=Sat → grid row: Mon=0 … Sun=6
  return (new Date().getDay() + 6) % 7;
}

export function PeakTimesCard({ peak }: Props) {
  const today = todayGridRow();

  return (
    <div className="mb-5 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Peak times
      </h2>
      <p className="mb-4 text-xs text-zinc-400 dark:text-zinc-500">
        Predicted busy times — based on 90 days of logs and current weather.
      </p>

      {/* Scrollable heatmap */}
      <div className="overflow-x-auto pb-1">
        <table className="w-full border-separate border-spacing-[2px]" style={{ minWidth: 340 }}>
          <thead>
            <tr>
              {/* Corner cell */}
              <th className="w-8" />
              {peak.hour_labels.map((h) => (
                <th
                  key={h}
                  className="text-center font-mono text-[10px] font-normal tabular-nums text-zinc-400 dark:text-zinc-500"
                  style={{ minWidth: 20 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {peak.grid.map((row, rowIdx) => {
              const isToday = rowIdx === today;
              return (
                <tr key={rowIdx}>
                  {/* Day label */}
                  <td
                    className="pr-2 text-right leading-none"
                    style={{
                      fontFamily: "Fraunces, serif",
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "#A85530" : undefined,
                    }}
                  >
                    <span className={isToday ? "text-[color:#A85530]" : "text-zinc-500 dark:text-zinc-400"}>
                      {peak.dow_labels[rowIdx]}
                    </span>
                  </td>

                  {row.map((score, colIdx) => {
                    const isNull = score === null;
                    return (
                      <td
                        key={colIdx}
                        title={isNull ? "Closed" : `${score}`}
                        style={{
                          height: 18,
                          minWidth: 20,
                          borderRadius: 3,
                          background: isNull
                            ? "repeating-linear-gradient(45deg,#F5EDE6,#F5EDE6 3px,#EBD8CC 3px,#EBD8CC 6px)"
                            : cellColor(score),
                          outline: isToday ? "1px solid #A85530" : undefined,
                          outlineOffset: isToday ? 1 : undefined,
                        }}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Quiet</span>
        <div className="flex gap-[2px]">
          {[0.08, 0.24, 0.44, 0.65, 1].map((opacity, i) => (
            <div
              key={i}
              className="h-2.5 w-4 rounded-[2px]"
              style={{ background: `rgba(168,85,48,${opacity})` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Busy</span>
        <div
          className="ml-3 h-2.5 w-4 rounded-[2px]"
          style={{
            background:
              "repeating-linear-gradient(45deg,#F5EDE6,#F5EDE6 3px,#EBD8CC 3px,#EBD8CC 6px)",
          }}
        />
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Closed</span>
      </div>
    </div>
  );
}
