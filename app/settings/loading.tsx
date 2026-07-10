import { AppShell } from "@/app/components/AppShell";

export default function SettingsLoading() {
  const sections = [
    { label: "Account", rows: 2 },
    { label: "Subscription", rows: 1 },
    { label: "Preferences", rows: 3 },
    { label: "Account actions", rows: 2 },
  ];

  return (
    <AppShell contained={false}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-4">
        <div className="h-6 w-24 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />

        {sections.map((section) => (
          <div key={section.label} className="flex flex-col gap-2">
            <div className="h-3 w-20 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="animate-pulse overflow-hidden rounded-2xl bg-[color:var(--color-surface)] ring-1 ring-[color:var(--color-border)]">
              {Array.from({ length: section.rows }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-4"
                  style={
                    i > 0 ? { borderTop: "0.5px solid var(--color-border)" } : undefined
                  }
                >
                  <div className="h-4 w-32 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
                  <div className="h-4 w-6 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
