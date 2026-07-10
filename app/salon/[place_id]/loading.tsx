/** Mirrors SalonPageSkeleton in SalonPageClient.tsx so there's no visual jump on hydration. */
export default function SalonPageLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mb-5 animate-pulse rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="flex items-center justify-between gap-3">
          <div className="h-7 flex-1 rounded-lg bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-9 w-16 shrink-0 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-3 w-2/3 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
      </div>

      <div className="mb-5 animate-pulse rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mb-3 h-3 w-28 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="mb-4 flex gap-6">
          <div className="h-12 w-16 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-12 w-16 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
          ))}
        </div>
      </div>

      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-[#F0E4CF] px-1 dark:bg-zinc-700" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <div className="border-l-4 border-l-zinc-200 p-3 dark:border-l-zinc-700">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-[#F0E4CF] dark:bg-zinc-700" />
                <div className="h-3 w-24 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              </div>
              <div className="mb-2 h-4 w-3/4 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              <div className="aspect-[4/3] w-full rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
