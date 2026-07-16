"use client";

import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import {
  ACCENT_PRESETS,
  ACCENT_TEXT_HEX,
  findAccentPreset,
  publicCoverPhotoUrl,
  type AccentKey,
  type PageTheme,
} from "@/src/lib/salonPageTheme";
import Image from "next/image";
import { useRef, useState } from "react";
import { UpgradeButton } from "./UpgradeButton";
import type { DashboardData, Tier } from "./types";

function TierGate({
  tier,
  requiredTier,
  placeId,
  children,
}: {
  tier: Tier;
  requiredTier: Exclude<Tier, "free">;
  placeId: string;
  children: React.ReactNode;
}) {
  const rank = (t: Tier) => (t === "pro" ? 2 : t === "basic" ? 1 : 0);
  const hasAccess = rank(tier) >= rank(requiredTier);
  if (hasAccess) return <>{children}</>;
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none opacity-50 blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 px-4 text-center dark:bg-zinc-900/70">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Unlock with Salon {requiredTier === "pro" ? "Pro" : "Basic"}
        </p>
        <UpgradeButton placeId={placeId} tier={requiredTier} label={`Upgrade to ${requiredTier === "pro" ? "Pro" : "Basic"}`} />
      </div>
    </div>
  );
}

export function PageAppearanceWidget({ data }: { data: DashboardData }) {
  const { placeId, tier, pageTheme, salonName, logoUrl, initialVitrineFlavours } = data;

  const [accentKey, setAccentKey] = useState<AccentKey | null>(pageTheme.accent_key);
  const [announcementText, setAnnouncementText] = useState(pageTheme.announcement_text ?? "");
  const [announcementExpiresAt, setAnnouncementExpiresAt] = useState(
    pageTheme.announcement_expires_at ? pageTheme.announcement_expires_at.slice(0, 10) : "",
  );
  const [instagram, setInstagram] = useState(pageTheme.social_instagram ?? "");
  const [facebook, setFacebook] = useState(pageTheme.social_facebook ?? "");
  const [tiktok, setTiktok] = useState(pageTheme.social_tiktok ?? "");
  const [statsVisible, setStatsVisible] = useState(pageTheme.section_visibility.stats);
  const [recentLogsVisible, setRecentLogsVisible] = useState(pageTheme.section_visibility.recent_logs);

  const [coverPath, setCoverPath] = useState(pageTheme.cover_photo_url);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    () => new Set(initialVitrineFlavours.filter((f) => f.is_signature).map((f) => f.id)),
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isBasicOrPro = tier === "basic" || tier === "pro";
  const isPro = tier === "pro";
  const MAX_PINNED = 4;

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  function togglePinned(id: string) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_PINNED) {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const supabase = createClient();

    let newCoverPath = coverPath;
    if (coverFile && isBasicOrPro) {
      const blob = await resizeImageBeforeUpload(coverFile, 1200, 0.85);
      const filePath = `${placeId}/${Date.now()}.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("salon-covers")
        .upload(filePath, blob, { upsert: true, cacheControl: "3600", contentType: "image/webp" });
      if (uploadError) {
        setSaveError("Cover photo upload failed. Please try again.");
        setSaving(false);
        return;
      }
      newCoverPath = uploadData.path;
      setCoverPath(newCoverPath);
      setCoverFile(null);
      setCoverPreview(null);
    }

    const nextTheme: PageTheme = {
      accent_key: accentKey,
      announcement_text: announcementText.trim() || null,
      announcement_expires_at: announcementExpiresAt ? new Date(announcementExpiresAt).toISOString() : null,
      cover_photo_url: isBasicOrPro ? newCoverPath : pageTheme.cover_photo_url,
      social_instagram: instagram.trim() || null,
      social_facebook: facebook.trim() || null,
      social_tiktok: tiktok.trim() || null,
      section_visibility: {
        stats: isPro ? statsVisible : pageTheme.section_visibility.stats,
        recent_logs: isPro ? recentLogsVisible : pageTheme.section_visibility.recent_logs,
      },
    };

    try {
      await data.onPageThemeSave(nextTheme);
    } catch {
      setSaveError("Could not save changes. Please try again.");
      setSaving(false);
      return;
    }

    if (isPro) {
      const original = new Set(initialVitrineFlavours.filter((f) => f.is_signature).map((f) => f.id));
      const changed = initialVitrineFlavours.filter((f) => original.has(f.id) !== pinnedIds.has(f.id));
      const pinnedOrder = [...pinnedIds];
      await Promise.all(
        changed.map((f) =>
          supabase
            .from("vitrine_flavours")
            .update({
              is_signature: pinnedIds.has(f.id),
              signature_position: pinnedIds.has(f.id) ? pinnedOrder.indexOf(f.id) : null,
            })
            .eq("id", f.id),
        ),
      );
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  const previewAccent = findAccentPreset(accentKey) ?? ACCENT_PRESETS[0];
  const previewLogoUrl = logoUrl;
  const previewCoverUrl = coverPreview ?? publicCoverPhotoUrl(coverPath);

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Page appearance</h2>
      <p className="mb-5 text-xs text-zinc-500 dark:text-zinc-400">
        Customize how your public salon page looks to visitors.
      </p>

      {/* Live preview */}
      <div className="mb-5 overflow-hidden rounded-2xl ring-1 ring-zinc-200 dark:ring-zinc-700">
        <div className="relative flex h-20 w-full items-end justify-center bg-zinc-100 dark:bg-zinc-800">
          {previewCoverUrl ? (
            <Image src={previewCoverUrl} alt="" fill className="object-cover" />
          ) : null}
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-3 dark:bg-zinc-900">
          {previewLogoUrl ? (
            <Image src={previewLogoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-200 text-xs font-semibold text-zinc-500 dark:bg-zinc-700">
              {salonName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {salonName}
          </span>
          <span
            className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ backgroundColor: previewAccent.hex, color: ACCENT_TEXT_HEX[previewAccent.textColor] }}
          >
            Log a gelato →
          </span>
        </div>
        {announcementText.trim() ? (
          <div
            className="px-4 py-2 text-[11px] font-medium"
            style={{ backgroundColor: previewAccent.hex, color: ACCENT_TEXT_HEX[previewAccent.textColor] }}
          >
            {announcementText}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        {/* Accent colour */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Accent colour
          </p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setAccentKey(preset.key)}
                title={preset.label}
                className="h-9 w-9 rounded-full shadow-sm transition active:scale-90"
                style={{
                  backgroundColor: preset.hex,
                  outline: accentKey === preset.key ? `2.5px solid ${preset.hex}` : "none",
                  outlineOffset: accentKey === preset.key ? "3px" : "0",
                }}
              />
            ))}
          </div>
        </div>

        {/* Announcement banner */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Announcement banner
          </p>
          <input
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value.slice(0, 140))}
            maxLength={140}
            placeholder="e.g. Closed for the holidays until March 5"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Expires</label>
            <input
              type="date"
              value={announcementExpiresAt}
              onChange={(e) => setAnnouncementExpiresAt(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* Opening hours link */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Opening hours are managed separately —{" "}
          <a href="#opening-hours" className="font-medium text-[color:var(--brand-primary)] hover:underline">
            edit opening hours
          </a>
          .
        </p>

        {/* Social / website links */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Social links
          </p>
          <div className="flex flex-col gap-2">
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Instagram handle or URL"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="Facebook page URL"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <input
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="TikTok handle or URL"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* Cover photo — Basic+ */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Cover photo
          </p>
          <TierGate tier={tier} requiredTier="basic" placeId={placeId}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {previewCoverUrl ? "Change cover photo" : "Upload cover photo"}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </div>
          </TierGate>
        </div>

        {/* Section visibility + pinned signature flavours — Pro */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Public page sections
          </p>
          <TierGate tier={tier} requiredTier="pro" placeId={placeId}>
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                Show community stats
                <input type="checkbox" checked={statsVisible} onChange={(e) => setStatsVisible(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                Show recent visits
                <input
                  type="checkbox"
                  checked={recentLogsVisible}
                  onChange={(e) => setRecentLogsVisible(e.target.checked)}
                />
              </label>
            </div>
          </TierGate>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Signature flavours (up to {MAX_PINNED})
          </p>
          <TierGate tier={tier} requiredTier="pro" placeId={placeId}>
            {initialVitrineFlavours.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Add flavours to the Flavour Board first, then pin your signatures here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {initialVitrineFlavours.map((f) => {
                  const isPinned = pinnedIds.has(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => togglePinned(f.id)}
                      disabled={!isPinned && pinnedIds.size >= MAX_PINNED}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                        isPinned
                          ? "border-[#A85530] bg-[#A85530] text-white"
                          : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
            )}
          </TierGate>
        </div>

        {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--brand-primary-hover)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save page appearance"}
        </button>
        {saved && <p className="text-center text-xs text-[color:var(--brand-primary)]">Saved ✓</p>}
      </div>
    </div>
  );
}
