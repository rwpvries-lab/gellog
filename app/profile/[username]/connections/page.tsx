import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import { ConnectionsClient } from "./ConnectionsClient";

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const initialTab: "followers" | "following" =
    tab === "following" ? "following" : "followers";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

  return (
    <ConnectionsClient
      viewedUserId={profile.id}
      viewedUsername={username}
      currentUserId={user?.id ?? null}
      initialTab={initialTab}
    />
  );
}
