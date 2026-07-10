import { AppShell } from "@/app/components/AppShell";

export default function PublicProfileLoading() {
  return (
    <AppShell contentClassName="pb-4">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>

        <div className="flex flex-col items-center gap-3 pb-1">
          <div className="h-[86px] w-[86px] animate-pulse rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-5 w-40 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-3 w-24 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="mt-1 flex items-center gap-4">
            <div className="h-4 w-16 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="h-4 w-16 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          </div>
          <div className="mt-1 h-9 w-28 animate-pulse rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
      </div>

      <div className="px-1">
        <div className="grid animate-pulse grid-cols-3 gap-0 rounded-2xl bg-[color:var(--color-surface)] py-5 ring-1 ring-[color:var(--color-border)]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-2">
              <div className="h-6 w-8 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              <div className="h-3 w-12 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex animate-pulse gap-3 px-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 flex-1 rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
        ))}
      </div>

      <section>
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="flex flex-col gap-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-3xl bg-[color:var(--color-surface)] shadow-sm ring-1 ring-[color:var(--color-border)]"
            >
              <div className="aspect-[4/3] w-full bg-[#F0E4CF] dark:bg-zinc-700" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/5 max-w-[14rem] rounded bg-[#F0E4CF] dark:bg-zinc-700" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-20 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
                  <div className="h-7 w-24 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
