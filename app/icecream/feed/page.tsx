import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { IceCreamFeedClient, type IceCreamLog } from "./IceCreamFeedClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function IceCreamFeedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ice_cream_logs")
    .select(
      `
      id,
      salon_name,
      salon_lat,
      salon_lng,
      salon_place_id,
      overall_rating,
      notes,
      photo_url,
      visited_at,
      vessel,
      price_paid,
      weather_temp,
      weather_condition,
      profiles (
        id,
        username,
        avatar_url
      ),
      log_flavours (
        id,
        flavour_name,
        rating,
        tags
      )
    `,
    )
    .order("visited_at", { ascending: false })
    .limit(PAGE_SIZE);

  const logs = (data ?? []) as IceCreamLog[];

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load ice cream logs:", error);
  }

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

        <IceCreamFeedClient initialLogs={logs} pageSize={PAGE_SIZE} />
      </div>

      <Link
        href="/icecream/logs/new"
        className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-teal-500 text-3xl font-semibold text-white shadow-xl shadow-orange-400/40 ring-2 ring-white/60 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-teal-300/70 dark:shadow-none dark:ring-zinc-900"
        aria-label="Log a new ice cream"
      >
        +
      </Link>
    </main>
  );
}

