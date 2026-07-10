export default function SalonDashboardLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] lg:px-6">
      <div className="-mx-4 mb-5 flex animate-pulse items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <div className="h-4 w-24 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="h-4 w-32 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl bg-white px-4 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <div className="mb-2 h-3 w-16 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="h-7 w-12 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          </div>
        ))}
      </div>

      <div className="mb-6 animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mb-4 h-3 w-32 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="h-40 w-full rounded-xl bg-[#F0E4CF] dark:bg-zinc-700" />
      </div>

      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex animate-pulse items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <div className="h-4 w-40 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            <div className="h-4 w-16 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    </main>
  );
}
