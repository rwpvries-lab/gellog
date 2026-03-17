import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClaimForm } from "./ClaimForm";

export default async function SalonClaimPage({
  params,
}: {
  params: Promise<{ place_id: string }>;
}) {
  const { place_id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/salon/${place_id}/claim`);
  }

  let { data: salonProfile } = await supabase
    .from("salon_profiles")
    .select("is_claimed, owner_id, salon_name")
    .eq("place_id", place_id)
    .maybeSingle<{
      is_claimed: boolean;
      owner_id: string | null;
      salon_name: string;
    }>();

  // Auto-create the salon_profile if it doesn't exist yet
  // (user may have arrived here without visiting the salon page first)
  if (!salonProfile) {
    const { data: locationData, error: locationError } = await supabase
      .from("ice_cream_logs")
      .select("salon_name, salon_lat, salon_lng")
      .eq("salon_place_id", place_id)
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        salon_name: string;
        salon_lat: number | null;
        salon_lng: number | null;
      }>();

    if (locationError) {
      console.error("[claim page] ice_cream_logs query failed:", locationError);
    }

    // Explicit INSERT — avoids upsert hitting the UPDATE RLS policy path
    const { error: insertError } = await supabase
      .from("salon_profiles")
      .insert({
        place_id,
        is_claimed: false,
        salon_name: locationData?.salon_name ?? "Unknown salon",
        salon_lat: locationData?.salon_lat ?? null,
        salon_lng: locationData?.salon_lng ?? null,
      });

    if (insertError && insertError.code !== "23505") {
      // 23505 = unique_violation: row already exists, that's fine
      console.error("[claim page] salon_profiles insert failed:", insertError.code, insertError.message, insertError.details);
    }

    // Re-fetch regardless (row may have existed already)
    const { data: fetched, error: fetchError } = await supabase
      .from("salon_profiles")
      .select("is_claimed, owner_id, salon_name")
      .eq("place_id", place_id)
      .maybeSingle<{
        is_claimed: boolean;
        owner_id: string | null;
        salon_name: string;
      }>();

    if (fetchError) {
      console.error("[claim page] salon_profiles re-fetch failed:", fetchError.code, fetchError.message, fetchError.details);
    }

    salonProfile = fetched;
  }

  // If current user is already the owner, send them straight to their dashboard
  if (salonProfile?.is_claimed && salonProfile.owner_id === user.id) {
    redirect(`/salon/${place_id}/dashboard`);
  }

  // Already claimed by someone else
  if (salonProfile?.is_claimed) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <span className="mb-4 inline-block text-5xl">🔒</span>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Already claimed
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This salon has already been claimed. If you believe this is an
            error, contact us at{" "}
            <a
              href="mailto:hello@gellog.app"
              className="font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              hello@gellog.app
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  const salonName = salonProfile?.salon_name ?? "this salon";
  const prefillEmail = user.email ?? "";

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Claim {salonName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Fill in your details and we&apos;ll verify your ownership within 48
          hours.
        </p>
      </div>

      <div className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <ClaimForm
          placeId={place_id}
          currentUserId={user.id}
          prefillEmail={prefillEmail}
        />
      </div>
    </main>
  );
}
