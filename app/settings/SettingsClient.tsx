"use client";

import { VisibilityPicker, type Visibility } from "@/src/components/VisibilityPicker";
import { createClient } from "@/src/lib/supabase/client";
import { useState } from "react";

export function SettingsClient({
  userId,
  initialDefaultVisibility,
}: {
  userId: string;
  initialDefaultVisibility: Visibility;
}) {
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>(
    initialDefaultVisibility,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(v: Visibility) {
    setDefaultVisibility(v);
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ default_visibility: v })
      .eq("id", userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          Default post visibility
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          New logs will use this setting by default.
        </p>
      </div>
      <VisibilityPicker value={defaultVisibility} onChange={handleChange} />
      {saving && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Saving…</p>
      )}
      {saved && (
        <p className="text-xs text-teal-600 dark:text-teal-400">Saved ✓</p>
      )}
    </div>
  );
}
