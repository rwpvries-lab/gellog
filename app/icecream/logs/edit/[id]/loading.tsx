import { AppShell } from "@/app/components/AppShell";
import { GellogLogo } from "@/app/components/GellogLogo";

export default function EditLogLoading() {
  return (
    <AppShell contained={false}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-4">
        <div className="flex flex-col items-center gap-2">
          <GellogLogo size={88} priority />
          <p className="text-center text-sm text-[color:var(--color-text-secondary)]">
            Edit your scoop
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-11 w-full animate-pulse rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-11 w-full animate-pulse rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-[#F0E4CF] dark:bg-zinc-700" />
        </div>
      </div>
    </AppShell>
  );
}
