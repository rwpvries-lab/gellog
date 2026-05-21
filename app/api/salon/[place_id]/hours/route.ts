import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import {
  googlePeriodsToWeekHours,
  validateWeekHours,
  type WeekHours,
} from "@/src/lib/opening-hours";

const STALE_MS = 30 * 24 * 60 * 60 * 1000;

type GooglePeriod = {
  open: { day: number; time: string };
  close?: { day: number; time: string };
};

async function fetchGoogleHours(placeId: string): Promise<WeekHours | null> {
  const key =
    process.env.GOOGLE_PLACES_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  if (!key) return null;

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "opening_hours");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as {
      result?: { opening_hours?: { periods?: GooglePeriod[] } };
    };
    const periods = data.result?.opening_hours?.periods;
    if (!periods?.length) return null;
    return googlePeriodsToWeekHours(periods);
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ place_id: string }> },
) {
  const { place_id: placeId } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("salon_profiles")
    .select("hours_override, hours_google, hours_fetched_at")
    .eq("place_id", placeId)
    .maybeSingle<{
      hours_override: WeekHours | null;
      hours_google: WeekHours | null;
      hours_fetched_at: string | null;
    }>();

  const cachedGoogle = profile?.hours_google ?? null;
  const override = profile?.hours_override ?? null;

  if (override) {
    return NextResponse.json({
      source: "override",
      hours: override,
      googleHours: cachedGoogle,
      hasOverride: true,
    });
  }

  const fetchedAt = profile?.hours_fetched_at
    ? new Date(profile.hours_fetched_at)
    : null;
  const isStale =
    !fetchedAt || Date.now() - fetchedAt.getTime() > STALE_MS;

  if (!isStale && cachedGoogle) {
    return NextResponse.json({
      source: "google",
      hours: cachedGoogle,
      googleHours: cachedGoogle,
      hasOverride: false,
    });
  }

  const fresh = await fetchGoogleHours(placeId);

  if (profile !== null && fresh) {
    await supabase
      .from("salon_profiles")
      .update({
        hours_google: fresh,
        hours_fetched_at: new Date().toISOString(),
      })
      .eq("place_id", placeId);
  }

  if (!fresh) {
    return NextResponse.json({
      source: null,
      hours: null,
      googleHours: null,
      hasOverride: false,
    });
  }

  return NextResponse.json({
    source: "google",
    hours: fresh,
    googleHours: fresh,
    hasOverride: false,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ place_id: string }> },
) {
  const { place_id: placeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("salon_profiles")
    .select("owner_id")
    .eq("place_id", placeId)
    .maybeSingle<{ owner_id: string | null }>();

  if (!profile || profile.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const hours = validateWeekHours(body);
  if (!hours) {
    return NextResponse.json({ error: "invalid hours shape" }, { status: 400 });
  }

  const { error } = await supabase
    .from("salon_profiles")
    .update({ hours_override: hours })
    .eq("place_id", placeId);

  if (error) {
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
