"use client";

import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FlavourBoard, type Flavour, type Suggestion } from "./FlavourBoard";
import { VitrineBoard, type VitrineFlavour, type VitrineVisibilityLogRow } from "./VitrineBoard";
import {
  AnalyticsSection,
  type FlavourInsightRow,
  type MonthlyRating,
  type TopFlavour,
  type WeatherStat,
  type WeeklyVisit,
} from "./AnalyticsSection";

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
  salon_lat: number | null;
  salon_lng: number | null;
  logo_url: string | null;
  bio: string | null;
  phone: string | null;
  website: string | null;
  salon_subscription_tier: "free" | "basic" | "pro" | null;
  salon_subscription_expires_at: string | null;
};

type Stats = {
  totalVisits: number;
  avgRating: number;
  mostLoggedFlavour: string | null;
  visitsThisMonth: number;
};

type Props = {
  salonProfile: SalonProfile;
  stats: Stats;
  justClaimed: boolean;
  justUpgraded: boolean;
  initialFlavours: Flavour[];
  initialSuggestions: Suggestion[];
  weeklyVisits: WeeklyVisit[];
  topFlavours: TopFlavour[];
  weatherStats: WeatherStat[];
  monthlyRatings: MonthlyRating[];
  initialVitrineFlavours: VitrineFlavour[];
  initialVitrineLog: VitrineVisibilityLogRow[];
  flavourInsights: FlavourInsightRow[];
};

function SalonUpgradeButton({
  place_id,
  tier,
  label,
  className,
}: {
  place_id: string;
  tier: "basic" | "pro";
  label: string;
  className: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/salon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id, tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-70 ${className}`}
    >
      {loading && (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden
        />
      )}
      {loading ? "Redirecting…" : label}
    </button>
  );
}

export function DashboardClient({
  salonProfile,
  stats,
  justClaimed,
  justUpgraded,
  initialFlavours,
  initialSuggestions,
  weeklyVisits,
  topFlavours,
  weatherStats,
  monthlyRatings,
  initialVitrineFlavours,
  initialVitrineLog,
  flavourInsights,
}: Props) {
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

  useEffect(() => {
    if (justUpgraded) {
      router.replace(`/salon/${salonProfile.place_id}/dashboard`);
    }
  }, []);

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
        .upload(filePath, blob, {
          upsert: true,
          cacheControl: "3600",
          contentType: "image/webp",
        });
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
      .update({
        bio: bio || null,
        phone: phone || null,
        website: website || null,
        logo_url: newLogoPath,
      })
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

  useEffect(() => {
    setLogoImgError(false);
  }, [displayLogoUrl]);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      {/* Success banner after claiming */}
      {showClaimed && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-teal-50 px-4 py-3 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800">
          <div>
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">
              Claim submitted!
            </p>
            <p className="mt-0.5 text-xs text-teal-700 dark:text-teal-400">
              You can start managing your page now. We will verify your
              ownership within 48 hours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowClaimed(false)}
            className="mt-0.5 text-teal-500 hover:text-teal-700 dark:text-teal-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success banner after upgrading */}
      {showUpgraded && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-teal-50 px-4 py-3 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800">
          <div>
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">
              Subscription active!
            </p>
            <p className="mt-0.5 text-xs text-teal-700 dark:text-teal-400">
              Your salon plan has been upgraded. Thank you!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgraded(false)}
            className="mt-0.5 text-teal-500 hover:text-teal-700 dark:text-teal-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header card */}
      <div className="mb-5 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="group relative flex-shrink-0"
          >
            {displayLogoUrl && !logoImgError ? (
              <Image
                src={displayLogoUrl}
                alt={salonName}
                width={60}
                height={60}
                className="rounded-2xl object-cover ring-1 ring-zinc-100 dark:ring-zinc-800"
                loading="lazy"
                onError={() => setLogoImgError(true)}
              />
            ) : (
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-[color:var(--color-teal)] text-lg font-semibold text-[color:var(--color-on-brand)] ring-1 ring-zinc-100 dark:ring-zinc-800">
                {salonName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition group-hover:opacity-100">
              <span className="text-xs font-medium text-white">Edit</span>
            </div>
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setNameInput(salonName);
                  }
                }}
                className="w-full rounded-lg border border-teal-300 bg-white px-2 py-1 text-lg font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-teal-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="group flex items-center gap-1.5 text-left"
              >
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {salonName}
                </span>
                <span className="text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 dark:text-zinc-500">
                  ✏️
                </span>
              </button>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {salonProfile.claim_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60">
                  ✓ Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Pending verification
                </span>
              )}
              {tier === "pro" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800/60">
                  Salon Pro — €29/mo
                </span>
              ) : tier === "basic" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60">
                  Salon Basic — €9/mo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Free plan
                </span>
              )}
              <Link
                href={`/salon/${salonProfile.place_id}`}
                className="text-xs text-teal-700 hover:underline dark:text-teal-400"
              >
                View public page →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total visits", value: stats.totalVisits.toString() },
          { label: "Avg rating", value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—" },
          { label: "Top flavour", value: stats.mostLoggedFlavour ?? "—" },
          { label: "This month", value: stats.visitsThisMonth.toString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="mt-0.5 truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Analytics */}
      <AnalyticsSection
        tier={tier}
        placeId={salonProfile.place_id}
        weeklyVisits={weeklyVisits}
        topFlavours={topFlavours}
        weatherStats={weatherStats}
        monthlyRatings={monthlyRatings}
        flavourInsights={flavourInsights}
      />

      {/* Flavour Board */}
      <div className="mb-5 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Flavour Board
        </h2>
        <FlavourBoard
          salonId={salonProfile.id}
          initialFlavours={initialFlavours}
          initialSuggestions={initialSuggestions}
        />
      </div>

      {/* Vitrine — public flavour display */}
      <div className="mb-5 rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Vitrine
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Flavours you mark visible appear on your public salon page. Hiding a flavour does not delete it.
        </p>
        <VitrineBoard
          placeId={salonProfile.place_id}
          initialFlavours={initialVitrineFlavours}
          initialLog={initialVitrineLog}
        />
      </div>

      {/* Billing */}
      <div
        id="billing"
        className="mb-5 scroll-mt-4 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Billing
        </h2>

        {/* Plan comparison table */}
        <div className="mb-5 overflow-hidden rounded-2xl ring-1 ring-zinc-100 dark:ring-zinc-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                  Feature
                </th>
                <th className="px-3 py-2 text-center font-semibold text-teal-700 dark:text-teal-400">
                  Basic
                </th>
                <th className="px-3 py-2 text-center font-semibold text-orange-600 dark:text-orange-400">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(
                [
                  ["Claimed profile and flavour board", "Yes", "Yes"],
                  ["Visit analytics", "Basic", "Full"],
                  ["Loyalty stamp system", "No", "Yes"],
                  ["Featured placement in discovery map", "No", "Yes"],
                  ["Review responses", "No", "Yes"],
                ] as const
              ).map(([feature, basic, pro]) => (
                <tr key={feature} className="bg-white dark:bg-zinc-900">
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {feature}
                  </td>
                  <td className="px-3 py-2 text-center text-zinc-500 dark:text-zinc-400">
                    {basic}
                  </td>
                  <td className="px-3 py-2 text-center text-zinc-500 dark:text-zinc-400">
                    {pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upgrade buttons */}
        {tier !== "basic" && tier !== "pro" && (
          <SalonUpgradeButton
            place_id={salonProfile.place_id}
            tier="basic"
            label="Upgrade to Salon Basic — €9/mo"
            className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600"
          />
        )}
        {tier !== "pro" && (
          <SalonUpgradeButton
            place_id={salonProfile.place_id}
            tier="pro"
            label="Upgrade to Salon Pro — €29/mo"
            className="mt-2 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
          />
        )}

        {tier !== "free" && salonProfile.salon_subscription_expires_at && (
          <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Renews{" "}
            {new Date(
              salonProfile.salon_subscription_expires_at,
            ).toLocaleDateString("en-GB")}
          </p>
        )}
      </div>

      {/* Profile settings */}
      <div className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Profile settings
        </h2>
        <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-4">
          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Tell visitors about your salon…"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-teal-600 dark:focus:ring-teal-900/40"
            />
            <p className="text-right text-xs text-zinc-400">
              {bio.length}/280
            </p>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-teal-600 dark:focus:ring-teal-900/40"
            />
          </div>

          {/* Website */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yoursalon.com"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-teal-600 dark:focus:ring-teal-900/40"
            />
          </div>

          {/* Logo hint */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            To update your logo, tap the image in the header above.
            {logoFile && (
              <span className="ml-1 font-medium text-teal-700 dark:text-teal-400">
                New logo selected — save to apply.
              </span>
            )}
          </p>

          {saveError && (
            <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-300/50 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-60 dark:shadow-none dark:focus:ring-offset-zinc-950"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          {saved && (
            <p className="text-center text-xs text-teal-600 dark:text-teal-400">
              Saved ✓
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
