import { AppShell } from "@/app/components/AppShell";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const { upgrade } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const [{ data: profile }, { data: pushSub }, { data: ownedSalon }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "username, display_name, avatar_url, default_visibility, subscription_tier, subscription_expires_at",
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("salon_profiles")
        .select("salon_name, place_id")
        .eq("owner_id", user.id)
        .maybeSingle(),
    ]);

  const defaultVisibility =
    (profile?.default_visibility as "public" | "friends" | "private") ??
    "public";

  const tier =
    profile?.subscription_tier === "premium" ? "premium" : ("free" as const);

  const expiresAt = profile?.subscription_expires_at
    ? new Date(profile.subscription_expires_at)
    : null;

  const expiresLabel = expiresAt
    ? expiresAt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <AppShell contained={false}>
      <SettingsClient
        userId={user.id}
        email={user.email ?? ""}
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        initialDefaultVisibility={defaultVisibility}
        initialNotificationsEnabled={!!pushSub}
        tier={tier}
        expiresLabel={expiresLabel}
        ownedSalon={
          ownedSalon
            ? { name: ownedSalon.salon_name, placeId: ownedSalon.place_id }
            : null
        }
        showUpgradeSuccess={upgrade === "success"}
      />
    </AppShell>
  );
}
