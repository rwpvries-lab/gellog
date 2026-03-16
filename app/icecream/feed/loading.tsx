export default function IceCreamFeedLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pb-24 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Ice cream feed
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              See the latest scoops from everyone logging their adventures.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {/* Tab toggle placeholder */}
          <div className="h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />

          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-zinc-700" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-zinc-700" />
                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-zinc-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
