import { AppShell } from "@/app/components/AppShell";

/** Mirrors LogDetailSkeleton in LogDetailClient.tsx so there's no visual jump on hydration. */
export default function LogDetailLoading() {
  return (
    <AppShell contentClassName="pb-32">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="h-4 w-12 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
      </div>

      <div className="animate-pulse overflow-hidden rounded-3xl bg-[color:var(--color-surface)] shadow-sm ring-1 ring-[color:var(--color-border)]">
        <div className="border-l-4 border-l-[color:var(--color-border)] p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="h-3 w-28 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="h-3 w-12 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          </div>
          <div className="mb-2 flex justify-between gap-3">
            <div className="h-5 flex-1 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="h-8 w-16 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          </div>
          <div className="aspect-[4/3] w-full rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="h-6 w-20 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
          </div>
        </div>
        <div className="flex gap-3 border-t border-[color:var(--color-border)] px-3 py-2">
          <div className="h-6 w-14 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-6 w-14 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
      </div>

      <section className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex animate-pulse gap-3 rounded-2xl bg-[color:var(--color-surface)] p-3 ring-1 ring-[color:var(--color-border)]"
          >
            <div className="h-9 w-9 shrink-0 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="flex flex-1 flex-col gap-2 pt-0.5">
              <div className="h-3 w-20 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              <div className="h-3 w-full rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              <div className="h-3 w-4/5 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
