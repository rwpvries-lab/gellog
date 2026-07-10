import { AppShell } from "@/app/components/AppShell";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogStepWrapper } from "./LogStepWrapper";
import type { SalonData } from "@/src/components/SalonInput";

type GooglePlaceDetails = {
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: { types: string[]; long_name: string }[];
};

/** Single Places Details call fetching the union of fields both the name-resolution and salon-prefill paths need. */
async function fetchGooglePlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const key =
    process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  if (!key) return null;
  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json",
    );
    url.searchParams.set("place_id", placeId);
    url.searchParams.set(
      "fields",
      "name,formatted_address,geometry,address_components",
    );
    url.searchParams.set("key", key);
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      result?: GooglePlaceDetails;
      status?: string;
    };
    if (!data.result || data.status === "NOT_FOUND" || data.status === "INVALID_REQUEST") {
      return null;
    }
    return data.result;
  } catch {
    return null;
  }
}

export default async function NewIceCreamLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    place_id?: string;
    salon_place_id?: string;
    salon_name?: string;
    flavour?: string;
  }>;
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

  // Pre-fill salon from query params (e.g. vitrine tub → /log/new?salon_place_id=…&flavour=…)
  const raw = await searchParams;
  const place_id = raw.place_id ?? raw.salon_place_id;
  let salon_name = raw.salon_name;
  const flavour = raw.flavour;

  const placeDetails = place_id ? await fetchGooglePlaceDetails(place_id) : null;
  if (!salon_name && placeDetails?.name) {
    salon_name = placeDetails.name.trim();
  }

  let initialSalonData: SalonData | null = null;

  if (place_id && salon_name) {
    if (placeDetails) {
      const cityComponent = placeDetails.address_components?.find((c) =>
        c.types.includes("locality"),
      );
      initialSalonData = {
        salon_name: decodeURIComponent(salon_name),
        salon_place_id: place_id,
        salon_address: placeDetails.formatted_address ?? null,
        salon_lat: placeDetails.geometry?.location?.lat ?? null,
        salon_lng: placeDetails.geometry?.location?.lng ?? null,
        salon_city: cityComponent?.long_name ?? null,
      };
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
    <AppShell
      contained={false}
      mainStyle={{
        background: "var(--background-primary)",
        minHeight: "100vh",
      }}
      className="px-6 pb-8 pt-6"
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        <LogStepWrapper
          userId={user.id}
          defaultVisibility={defaultVisibility}
          initialSalonData={initialSalonData}
          initialPrefillFlavour={typeof flavour === "string" ? flavour : null}
        />
      </div>
    </AppShell>
  );
}

