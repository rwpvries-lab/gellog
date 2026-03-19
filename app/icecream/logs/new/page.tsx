import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewIceCreamLogForm } from "./NewIceCreamLogForm";
import type { SalonData } from "@/src/components/SalonInput";

export default async function NewIceCreamLogPage({
  searchParams,
}: {
  searchParams: Promise<{ place_id?: string; salon_name?: string }>;
}) {
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

  // Pre-fill salon from query params (e.g. coming from undiscovered salon page)
  const { place_id, salon_name } = await searchParams;
  let initialSalonData: SalonData | null = null;

  if (place_id && salon_name) {
    const key =
      process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;

    if (key) {
      try {
        const url = new URL(
          "https://maps.googleapis.com/maps/api/place/details/json",
        );
        url.searchParams.set("place_id", place_id);
        url.searchParams.set(
          "fields",
          "name,formatted_address,geometry,address_components",
        );
        url.searchParams.set("key", key);

        const res = await fetch(url.toString());
        const data = (await res.json()) as {
          result?: {
            name?: string;
            formatted_address?: string;
            geometry?: { location?: { lat?: number; lng?: number } };
            address_components?: { types: string[]; long_name: string }[];
          };
        };

        const result = data.result;
        if (result) {
          const cityComponent = result.address_components?.find((c) =>
            c.types.includes("locality"),
          );
          initialSalonData = {
            salon_name: decodeURIComponent(salon_name),
            salon_place_id: place_id,
            salon_address: result.formatted_address ?? null,
            salon_lat: result.geometry?.location?.lat ?? null,
            salon_lng: result.geometry?.location?.lng ?? null,
            salon_city: cityComponent?.long_name ?? null,
          };
        }
      } catch {
        // fall through to name-only fallback
      }
    }

    // Fallback: name + place_id only, no coordinates
    if (!initialSalonData) {
      initialSalonData = {
        salon_name: decodeURIComponent(salon_name),
        salon_place_id: place_id,
        salon_address: null,
        salon_lat: null,
        salon_lng: null,
        salon_city: null,
      };
    }
  }

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
        <NewIceCreamLogForm
          userId={user.id}
          defaultVisibility={defaultVisibility}
          initialSalonData={initialSalonData}
        />
      </main>
    </div>
  );
}

