import { AppShell } from "@/app/components/AppShell";
import { Icon } from "@/src/components/icons";
import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BlockedUsersClient, type BlockedUser } from "./BlockedUsersClient";

export default async function BlockedUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/blocked-users");
  }

  const { data } = await supabase
    .from("blocked_users")
    .select(
      "id, blocked_id, created_at, blocked:profiles!blocked_users_blocked_id_fkey(username, display_name, avatar_url)",
    )
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  const blocked: BlockedUser[] = (data ?? []).map((row) => {
    const profile = row.blocked as unknown as {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
    return {
      id: row.id as string,
      blockedId: row.blocked_id as string,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
  });

  return (
    <AppShell contained={false}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-4">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              flexShrink: 0,
            }}
            aria-label="Back to settings"
          >
            <Icon name="GellogBack" size={18} strokeWidth={2} />
          </Link>
          <h1
            className="font-serif"
            style={{
              color: "var(--color-text-primary)",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Blocked users
          </h1>
        </div>

        <BlockedUsersClient initialBlocked={blocked} />
      </div>
    </AppShell>
  );
}
