import { AppShell } from "@/app/components/AppShell";

/** Mirrors LogStepWrapper's step-1 header + search field so there's no jump on hydration. */
export default function NewLogLoading() {
  return (
    <AppShell
      contained={false}
      mainStyle={{ background: "var(--background-primary)", minHeight: "100vh" }}
      className="px-6 pb-8 pt-6"
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="flex min-w-0 flex-1 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 flex-1 animate-pulse rounded-full bg-[color:var(--brand-primary-muted)]"
              />
            ))}
          </div>
        </div>

        <div className="mt-4 h-3 w-20 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="mt-2 h-9 w-3/4 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-[color:var(--border-default)] px-4 py-3">
            <div className="h-5 w-5 shrink-0 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="h-4 w-2/3 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 px-1">
              <div className="h-9 w-9 shrink-0 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-1/2 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
                <div className="h-3 w-1/3 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
