import { createClient } from "@/src/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const input = req.nextUrl.searchParams.get("input");
  const locationBias = req.nextUrl.searchParams.get("locationBias");

  if (!input) {
    return NextResponse.json({ error: "missing input" }, { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  if (!key) {
    return NextResponse.json({ error: "no key" }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("types", "establishment");
  url.searchParams.set("key", key);
  if (locationBias) url.searchParams.set("locationbias", locationBias);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[places/autocomplete] Google status:", data.status, data.error_message);
  }
  return NextResponse.json(data);
}
