import { AppShell } from "@/app/components/AppShell";
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
    <AppShell contained={false}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-4">
        <div className="flex flex-col items-center gap-2">
          <GellogLogo size={88} priority />
          <p className="text-center text-sm text-[color:var(--color-text-secondary)]">
            Edit your scoop
          </p>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <EditIceCreamLogForm userId={user.id} log={log as any} />
      </div>
    </AppShell>
  );
}
