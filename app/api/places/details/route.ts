import { createClient } from "@/src/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const placeId = req.nextUrl.searchParams.get("place_id");

  if (!placeId) {
    return NextResponse.json({ error: "missing place_id" }, { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  if (!key) {
    return NextResponse.json({ error: "no key" }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,place_id,formatted_address,geometry,address_components",
  );
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = await res.json();
  return NextResponse.json(data);
}
