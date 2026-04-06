import { GellogLogo } from "@/app/components/GellogLogo";
import { createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { EditIceCreamLogForm } from "./EditIceCreamLogForm";

export default async function EditIceCreamLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/icecream/logs/edit/${id}`);
  }

  const { data: log } = await supabase
    .from("ice_cream_logs")
    .select(
      `
      id,
      user_id,
      salon_name,
      salon_place_id,
      salon_address,
      salon_lat,
      salon_lng,
      salon_city,
      overall_rating,
      notes,
      photo_url,
      visited_at,
      vessel,
      price_paid,
      weather_temp,
      weather_condition,
      visibility,
      photo_visibility,
      price_hidden_from_others,
      log_flavours (
        id,
        flavour_name,
        rating,
        tags,
        rating_texture,
        rating_originality,
        rating_intensity,
        rating_presentation
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!log || log.user_id !== user.id) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-orange-100 via-orange-50 to-teal-100 px-4 py-8 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <main className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <GellogLogo size={88} />
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Edit your scoop
          </p>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <EditIceCreamLogForm userId={user.id} log={log as any} />
      </main>
    </div>
  );
}
