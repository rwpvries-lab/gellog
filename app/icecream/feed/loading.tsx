import { GellogLogo } from "@/app/components/GellogLogo";
import { Bell } from "lucide-react";
import Link from "next/link";

export default function IceCreamFeedLoading() {
  return (
    <main
      className="px-4 pb-24 pt-4"
      style={{ background: "var(--page-gradient-bg)", minHeight: "100vh" }}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="min-w-0" aria-hidden />
          <Link href="/icecream/feed" className="flex justify-center" aria-hidden tabIndex={-1}>
            <GellogLogo size={40} priority />
          </Link>
          <div className="flex min-w-0 justify-end">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-text-tertiary)]"
              aria-hidden
            >
              <Bell className="h-[1.35rem] w-[1.35rem]" strokeWidth={2} />
            </span>
          </div>
        </header>

        <div
          className="flex border-b border-[color:var(--color-border)]"
          role="tablist"
          aria-label="Feed scope"
        >
          <div className="relative flex flex-1 justify-center px-2 pb-3 pt-1 text-sm font-semibold text-[color:var(--color-teal)]">
            Discover
            <span
              className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[color:var(--color-teal)]"
              aria-hidden
            />
          </div>
          <div className="flex flex-1 justify-center px-2 pb-3 pt-1 text-sm font-semibold text-[color:var(--color-text-secondary)]">
            Friends
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-3xl bg-[color:var(--color-surface)] shadow-sm ring-1 ring-[color:var(--color-border)]"
            >
              <div className="aspect-[4/3] w-full bg-[color:var(--color-surface-alt)]" />
              <div className="space-y-3 p-4">
                <div className="space-y-2">
                  <div className="h-4 w-3/5 max-w-[14rem] rounded bg-[color:var(--color-surface-alt)]" />
                  <div className="h-3 w-2/5 max-w-[8rem] rounded bg-[color:var(--color-surface-alt)]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-20 rounded-full bg-[color:var(--color-surface-alt)]" />
                  <div className="h-7 w-24 rounded-full bg-[color:var(--color-surface-alt)]" />
                </div>
                <div className="flex justify-between gap-3 pt-1">
                  <div className="h-4 flex-1 rounded bg-[color:var(--color-surface-alt)]" />
                  <div className="h-4 w-14 shrink-0 rounded bg-[color:var(--color-surface-alt)]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-16 rounded-full bg-[color:var(--color-surface-alt)]" />
                  <div className="h-6 w-24 rounded-full bg-[color:var(--color-surface-alt)]" />
                  <div className="h-6 w-14 rounded-full bg-[color:var(--color-surface-alt)]" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[color:var(--color-border)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-[color:var(--color-surface-alt)]" />
                  <div className="h-3 w-24 rounded bg-[color:var(--color-surface-alt)]" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-9 rounded-full bg-[color:var(--color-surface-alt)]" />
                  <div className="h-9 w-9 rounded-full bg-[color:var(--color-surface-alt)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
