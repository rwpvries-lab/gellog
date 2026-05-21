import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
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

  const { error } = await supabase
    .from("salon_profiles")
    .update({ hours_override: null })
    .eq("place_id", placeId);

  if (error) {
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
