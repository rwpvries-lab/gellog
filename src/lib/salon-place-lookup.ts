import "server-only";

/** Public resolver for salon pages with no logs yet — shared by the API route and the salon page server component. */
export async function lookupPlaceName(placeId: string): Promise<string | null> {
  const key = process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = (await res.json()) as { result?: { name?: string }; status?: string };

  const name = data.result?.name;
  if (!name || data.status === "NOT_FOUND" || data.status === "INVALID_REQUEST") {
    return null;
  }
  return name;
}
