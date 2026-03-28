import { UpgradeButton } from "@/src/components/UpgradeButton";
import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const { upgrade } = await searchParams;
  const showUpgradeSuccess = upgrade === "success";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "default_visibility, subscription_tier, subscription_expires_at",
    )
    .eq("id", user.id)
    .single();

  const defaultVisibility =
    (profile?.default_visibility as "public" | "friends" | "private") ??
    "public";

  const tier = profile?.subscription_tier === "premium" ? "premium" : "free";
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
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-teal-50 px-4 pb-24 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <Link
            href="/icecream/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-lg text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            ‹
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Settings
          </h1>
        </header>

        {showUpgradeSuccess && (
          <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-100">
            Welcome to Ice Cream+ — your subscription is active.
          </p>
        )}

        <section className="flex flex-col gap-3 rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Ice Cream+
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Current tier:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {tier === "premium" ? "Premium" : "Free"}
              </span>
            </p>
          </div>
          {tier === "premium" ? (
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              You are on Ice Cream+
              {expiresLabel ? (
                <>
                  {" "}
                  — renews or ends on{" "}
                  <span className="font-medium">{expiresLabel}</span>.
                </>
              ) : null}
            </p>
          ) : (
            <>
              <UpgradeButton />
              <ul className="list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                <li>Advanced stats</li>
                <li>No ads</li>
                <li>Passport stamps</li>
              </ul>
            </>
          )}
        </section>

        <SettingsClient
          userId={user.id}
          initialDefaultVisibility={defaultVisibility}
        />
      </div>
    </main>
  );
}
