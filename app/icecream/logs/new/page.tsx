import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewIceCreamLogForm } from "./NewIceCreamLogForm";

export default async function NewIceCreamLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/icecream/logs/new");
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
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-orange-100 via-orange-50 to-teal-100 px-4 py-8 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <main className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 drop-shadow-sm dark:text-zinc-50">
            <span className="text-orange-500">Gel</span>
            <span className="text-teal-600 dark:text-teal-400">log</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            New scoop, who this?
          </p>
        </div>
        <NewIceCreamLogForm userId={user.id} defaultVisibility={defaultVisibility} />
      </main>
    </div>
  );
}

