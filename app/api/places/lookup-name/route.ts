import { NextRequest, NextResponse } from "next/server";

/** Public resolver for salon pages with no logs yet (matches server-side Google lookup). */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "missing place_id" }, { status: 400 });
  }

  const key =
    process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  if (!key) {
    return NextResponse.json({ error: "no key" }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = (await res.json()) as { result?: { name?: string }; status?: string };

  const name = data.result?.name;
  if (!name || data.status === "NOT_FOUND" || data.status === "INVALID_REQUEST") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ name });
}
