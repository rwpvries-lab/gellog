import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { computeSalonPeakGrid } from "@/src/lib/salonPeakGrid";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ place_id: string }> },
) {
  const { place_id: placeId } = await params;
  const payload = await computeSalonPeakGrid(placeId);
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
