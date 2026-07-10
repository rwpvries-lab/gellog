import { NextRequest, NextResponse } from "next/server";
import { lookupPlaceName } from "@/src/lib/salon-place-lookup";

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "missing place_id" }, { status: 400 });
  }

  const name = await lookupPlaceName(placeId);
  if (!name) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ name });
}
