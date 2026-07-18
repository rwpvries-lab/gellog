"use client";

import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import { resolvePageTheme, type PageTheme } from "@/src/lib/salonPageTheme";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { BillingCard } from "./BillingCard";
import type { VitrineVisibilityLogRow } from "./FlavourBoard";
import { HeaderCard } from "./HeaderCard";
import { OpeningHoursEditor } from "./OpeningHoursEditor";
import { ProfileSettingsForm } from "./ProfileSettingsForm";
import { DashboardWidgetGrid } from "./widgets/DashboardWidgetGrid";
import type { DashboardDataBase } from "./widgets/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getLogoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/salon-logos/${path}`;
}

type SalonProfile = {
  id: string;
  place_id: string;
  is_claimed: boolean;
  claim_verified: boolean;
  owner_id: string | null;
  salon_name: string;
  logo_url: string | null;
  bio: string | null;
  phone: string | null;
  website: string | null;
  salon_subscription_tier: "free" | "basic" | "pro" | null;
  salon_subscription_expires_at: string | null;
  dashboard_layout: unknown;
  page_theme: unknown;
};

export type OwnerSalonOption = {
  place_id: string;
  salon_name: string;
};

type Props = {
  salonProfile: SalonProfile;
  ownerSalons: OwnerSalonOption[];
  justClaimed: boolean;
  justUpgraded: boolean;
  dashboardData: DashboardDataBase;
};

export function DashboardClient({ salonProfile, ownerSalons, justClaimed, justUpgraded, dashboardData }: Props) {
  const router = useRouter();
  const tier = salonProfile.salon_subscription_tier ?? "free";
  const [salonName, setSalonName] = useState(salonProfile.salon_name);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(salonProfile.salon_name);

  const [bio, setBio] = useState(salonProfile.bio ?? "");
  const [phone, setPhone] = useState(salonProfile.phone ?? "");
  const [website, setWebsite] = useState(salonProfile.website ?? "");

  const [logoUrl, setLogoUrl] = useState(salonProfile.logo_url);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoImgError, setLogoImgError] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showClaimed, setShowClaimed] = useState(justClaimed);
  const [showUpgraded, setShowUpgraded] = useState(justUpgraded);

  const [visibilityLog, setVisibilityLog] = useState<VitrineVisibilityLogRow[]>(
    dashboardData.initialVitrineLog,
  );
  const [flavourNameById, setFlavourNameById] = useState<Record<string, string>>(() =>
    Object.fromEntries(dashboardData.initialVitrineFlavours.map((f) => [f.id, f.name])),
  );

  const handleVisibilityLogAppend = useCallback((row: VitrineVisibilityLogRow) => {
    setVisibilityLog((prev) => [row, ...prev].slice(0, 50));
  }, []);

  const handleFlavoursSnapshot = useCallback((rows: { id: string; name: string }[]) => {
    setFlavourNameById(Object.fromEntries(rows.map((r) => [r.id, r.name])));
  }, []);

  const [pageTheme, setPageTheme] = useState<PageTheme>(() => resolvePageTheme(salonProfile.page_theme));

  const handlePageThemeSave = useCallback(
    async (next: PageTheme) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("salon_profiles")
        .update({ page_theme: next })
        .eq("place_id", salonProfile.place_id);
      if (error) throw error;
      setPageTheme(next);
    },
    [salonProfile.place_id],
  );

  useEffect(() => {
    if (justUpgraded) {
      router.replace(`/salon/${salonProfile.place_id}/dashboard`);
    }
  }, [justUpgraded, router, salonProfile.place_id]);

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === salonName) {
      setEditingName(false);
      setNameInput(salonName);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("salon_profiles")
      .update({ salon_name: trimmed })
      .eq("place_id", salonProfile.place_id);
    if (!error) {
      setSalonName(trimmed);
      router.refresh();
    }
    setEditingName(false);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      setLogoImgError(false);
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const supabase = createClient();
    let newLogoPath = salonProfile.logo_url;

    if (logoFile) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveError("Not authenticated.");
        setSaving(false);
        return;
      }
      const blob = await resizeImageBeforeUpload(logoFile, 400, 0.85);
      const filePath = `${salonProfile.place_id}/${Date.now()}.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("salon-logos")
        .upload(filePath, blob, { upsert: true, cacheControl: "3600", contentType: "image/webp" });
      if (uploadError) {
        setSaveError("Logo upload failed. Please try again.");
        setSaving(false);
        return;
      }
      newLogoPath = uploadData.path;
      setLogoUrl(newLogoPath);
      setLogoFile(null);
      setLogoPreview(null);
      setLogoImgError(false);
    }

    const { error } = await supabase
      .from("salon_profiles")
      .update({ bio: bio || null, phone: phone || null, website: website || null, logo_url: newLogoPath })
      .eq("place_id", salonProfile.place_id);

    if (error) {
      setSaveError("Could not save changes. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
    setSaving(false);
  }

  const displayLogoUrl = logoPreview ?? getLogoUrl(logoUrl);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] lg:px-6">
      <div className="-mx-4 mb-5 flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <Link
          href={`/salon/${salonProfile.place_id}`}
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-zinc-700 transition hover:text-[color:var(--brand-primary)] dark:text-zinc-200"
        >
          <Icon name="GellogBack" size={18} strokeWidth={2} />
          <span>Salon page</span>
        </Link>
        <span className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {salonName}
        </span>
      </div>

      {showClaimed && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Claim submitted!</p>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
              You can start managing your page now. We will verify your ownership within 48 hours.
            </p>
          </div>
          <button type="button" onClick={() => setShowClaimed(false)} className="mt-0.5 text-[color:var(--brand-primary)] hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {showUpgraded && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Subscription active!</p>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">Your salon plan has been upgraded. Thank you!</p>
          </div>
          <button type="button" onClick={() => setShowUpgraded(false)} className="mt-0.5 text-[color:var(--brand-primary)] hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {ownerSalons.length > 1 ? (
        <div className="mb-5 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <label htmlFor="dashboard-salon-switcher" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Current salon
          </label>
          <select
            id="dashboard-salon-switcher"
            value={salonProfile.place_id}
            onChange={(e) => {
              const next = e.target.value;
              if (next && next !== salonProfile.place_id) {
                router.push(`/salon/${encodeURIComponent(next)}/dashboard`);
              }
            }}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            {ownerSalons.map((s) => (
              <option key={s.place_id} value={s.place_id}>
                {s.salon_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-x-0 lg:gap-y-6">
        <section className="min-w-0 space-y-5 lg:pr-8">
          <HeaderCard
            placeId={salonProfile.place_id}
            salonName={salonName}
            claimVerified={salonProfile.claim_verified}
            tier={tier}
            editingName={editingName}
            nameInput={nameInput}
            onNameInputChange={setNameInput}
            onStartEditName={() => setEditingName(true)}
            onSaveName={() => void saveName()}
            onCancelEditName={() => {
              setEditingName(false);
              setNameInput(salonName);
            }}
            displayLogoUrl={displayLogoUrl}
            logoImgError={logoImgError}
            onLogoImgError={() => setLogoImgError(true)}
            onLogoClick={() => logoInputRef.current?.click()}
            logoInputRef={logoInputRef}
            onLogoFileChange={handleLogoChange}
          />

          <DashboardWidgetGrid
            data={{
              ...dashboardData,
              salonName,
              logoUrl: displayLogoUrl,
              pageTheme,
              onPageThemeSave: handlePageThemeSave,
              visibilityLog,
              flavourNameById,
              onVisibilityLogAppend: handleVisibilityLogAppend,
              onFlavoursSnapshot: handleFlavoursSnapshot,
            }}
            placeId={salonProfile.place_id}
            initialDashboardLayout={salonProfile.dashboard_layout}
          />
        </section>

        <aside
          id="settings"
          className="min-w-0 scroll-mt-28 lg:self-start lg:border-l lg:border-zinc-200/80 lg:pl-8 dark:lg:border-zinc-800"
        >
          <div className="space-y-4 rounded-3xl bg-zinc-50/80 p-3 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.7)] ring-1 ring-zinc-200/70 dark:bg-zinc-900/60 dark:ring-zinc-700/70 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
            <div className="space-y-4 [&>*]:mb-0">
              <ProfileSettingsForm
                bio={bio}
                onBioChange={setBio}
                phone={phone}
                onPhoneChange={setPhone}
                website={website}
                onWebsiteChange={setWebsite}
                pendingLogoFile={logoFile != null}
                saving={saving}
                saveError={saveError}
                saved={saved}
                onSubmit={(e) => void handleSave(e)}
              />

              <OpeningHoursEditor placeId={salonProfile.place_id} />

              <BillingCard
                placeId={salonProfile.place_id}
                tier={tier}
                subscriptionExpiresAt={salonProfile.salon_subscription_expires_at}
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
