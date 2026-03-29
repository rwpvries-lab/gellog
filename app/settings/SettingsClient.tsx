"use client";

import { VisibilityPicker, type Visibility } from "@/src/components/VisibilityPicker";
import { createClient } from "@/src/lib/supabase/client";
import { deletePushSubscription, subscribeToPush } from "@/src/lib/push";
import { useState } from "react";

export function SettingsClient({
  userId,
  initialDefaultVisibility,
  initialNotificationsEnabled,
}: {
  userId: string;
  initialDefaultVisibility: Visibility;
  initialNotificationsEnabled: boolean;
}) {
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>(
    initialDefaultVisibility,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initialNotificationsEnabled,
  );
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

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

  async function handleNotificationsToggle() {
    setNotifLoading(true);
    setNotifError(null);
    try {
      if (notificationsEnabled) {
        await deletePushSubscription();
        setNotificationsEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setNotifError("Notification permission was denied. Please allow notifications in your browser settings.");
          return;
        }
        await subscribeToPush();
        setNotificationsEnabled(true);
      }
    } catch (e) {
      setNotifError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setNotifLoading(false);
    }
  }

  return (
    <>
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

      <div className="flex flex-col gap-4 rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            Notifications
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Notify me when a friend logs near me
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${notificationsEnabled ? "text-teal-600 dark:text-teal-400" : "text-zinc-400 dark:text-zinc-500"}`}>
            {notificationsEnabled ? "Notifications on" : "Notifications off"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={notificationsEnabled}
            disabled={notifLoading}
            onClick={handleNotificationsToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
              notificationsEnabled
                ? "bg-teal-500 dark:bg-teal-600"
                : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
                notificationsEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {notifError && (
          <p className="text-xs text-red-600 dark:text-red-400">{notifError}</p>
        )}
      </div>
    </>
  );
}
