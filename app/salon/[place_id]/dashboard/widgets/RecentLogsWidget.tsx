import Image from "next/image";
import type { DashboardData } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/log-photos/${path}`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function RecentLogsWidget({ data }: { data: DashboardData }) {
  const logs = data.recentLogs;

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent visits</h2>
      {logs.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          No visits logged at this salon yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log) => {
            const photoUrl = getPhotoUrl(log.photo_url);
            return (
              <div key={log.id} className="flex items-center gap-3">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-zinc-100 dark:ring-zinc-800"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                    {(log.username ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                    <span className="font-medium">{log.username ?? "Someone"}</span>
                    {log.flavour_names.length > 0 ? (
                      <span className="text-zinc-500 dark:text-zinc-400"> — {log.flavour_names[0]}
                        {log.flavour_names.length > 1 ? ` +${log.flavour_names.length - 1}` : ""}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(log.visited_at)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[color:var(--brand-primary)]">
                  ★{log.overall_rating}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
