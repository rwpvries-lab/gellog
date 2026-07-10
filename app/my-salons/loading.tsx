export default function MySalonsLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mb-6">
        <div className="h-6 w-32 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-[#F0E4CF] dark:bg-zinc-700" />
      </div>

      <ul className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <li
            key={i}
            className="flex animate-pulse items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
              <div className="h-3 w-24 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
            </div>
            <div className="h-4 w-20 shrink-0 rounded bg-[#F0E4CF] dark:bg-zinc-700" />
          </li>
        ))}
      </ul>
    </main>
  );
}
