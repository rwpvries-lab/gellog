import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_visibility")
    .eq("id", user.id)
    .single();

  const defaultVisibility =
    (profile?.default_visibility as "public" | "friends" | "private") ??
    "public";

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pb-24 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <Link
            href="/icecream/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-lg text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            ‹
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Settings
          </h1>
        </header>

        <SettingsClient
          userId={user.id}
          initialDefaultVisibility={defaultVisibility}
        />
      </div>
    </main>
  );
}
