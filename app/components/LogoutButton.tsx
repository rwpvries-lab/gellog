"use client";

import { createClient } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex h-11 min-w-[120px] items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus:ring-offset-zinc-900"
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
