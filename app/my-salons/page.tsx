import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MySalonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/my-salons");
  }

  const { data: rows, error } = await supabase
    .from("salon_profiles")
    .select("place_id, salon_name, claim_verified")
    .eq("owner_id", user.id)
    .eq("is_claimed", true)
    .order("salon_name", { ascending: true });

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Could not load your salons.</p>
      </main>
    );
  }

  const salons = rows ?? [];

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">My Salons</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Open the dashboard for any location you manage.
        </p>
      </div>

      {salons.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You don&apos;t have any claimed salons yet.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Find a salon →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {salons.map((s) => (
            <li key={s.place_id}>
              <Link
                href={`/salon/${encodeURIComponent(s.place_id)}/dashboard`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 transition hover:ring-teal-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:ring-teal-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{s.salon_name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {s.claim_verified ? "Verified" : "Pending verification"}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-teal-700 dark:text-teal-400">Dashboard →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
