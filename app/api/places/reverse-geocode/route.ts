import { createClient } from "@/src/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "missing lat/lng" }, { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  if (!key) {
    return NextResponse.json({ error: "no key" }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = await res.json();
  return NextResponse.json(data);
}
