"use client";

import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlavourBoard,
  type Suggestion,
  type VitrineFlavour,
  type VitrineVisibilityLogRow,
} from "./FlavourBoard";
import { OpeningHoursEditor } from "./OpeningHoursEditor";
import {
  AnalyticsSection,
  FlavourInsightsCollapsibleSection,
  type FlavourInsightRow,
  type MonthlyRating,
  type TopFlavour,
  type WeatherStat,
  type WeeklyVisit,
} from "./AnalyticsSection";
import { PeakTimesCard } from "./PeakTimesCard";
import { SalonDashboardWeatherCard } from "./SalonDashboardWeatherCard";
import type { SalonDashboardWeatherPayload } from "@/src/lib/salonDashboardWeather";
import type { PeakGridPayload } from "@/src/lib/salonPeakGrid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getLogoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/salon-logos/${path}`;
}

/** Fixed UTC string so SSR and browser hydration always match (avoids locale/ICU differences). */
function formatVisibilityLogInstant(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min} UTC`;
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

export type OwnerSalonOption = {
  place_id: string;
  salon_name: string;
};

type Props = {
  salonProfile: SalonProfile;
  ownerSalons: OwnerSalonOption[];
  stats: Stats;
  justClaimed: boolean;
  justUpgraded: boolean;
  initialSuggestions: Suggestion[];
  weeklyVisits: WeeklyVisit[];
  topFlavours: TopFlavour[];
  weatherStats: WeatherStat[];
  monthlyRatings: MonthlyRating[];
  initialVitrineFlavours: VitrineFlavour[];
  initialVitrineLog: VitrineVisibilityLogRow[];
  flavourInsights: FlavourInsightRow[];
  dashboardWeather: SalonDashboardWeatherPayload | null;
  salonHasCoordinates: boolean;
  peakGrid: PeakGridPayload | null;
};

const DASHBOARD_SECTION_IDS = [
  "dashboard-overview",
  "analytics",
  "settings",
] as const;
type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

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
  ownerSalons,
  stats,
  justClaimed,
  justUpgraded,
  initialSuggestions,
  weeklyVisits,
  topFlavours,
  weatherStats,
  monthlyRatings,
  initialVitrineFlavours,
  initialVitrineLog,
  flavourInsights,
  dashboardWeather,
  salonHasCoordinates,
  peakGrid,
}: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<DashboardSectionId>("dashboard-overview");
  const activeSectionIndex = DASHBOARD_SECTION_IDS.indexOf(activeSection);
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
  const [visibilityLog, setVisibilityLog] = useState<VitrineVisibilityLogRow[]>(initialVitrineLog);
  const [visibilityHistoryOpen, setVisibilityHistoryOpen] = useState(false);
  const [flavourNameById, setFlavourNameById] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialVitrineFlavours.map((f) => [f.id, f.name])),
  );

  const handleVisibilityLogAppend = useCallback((row: VitrineVisibilityLogRow) => {
    setVisibilityLog((prev) => [row, ...prev].slice(0, 50));
  }, []);

  const handleFlavoursSnapshot = useCallback((rows: { id: string; name: string }[]) => {
    setFlavourNameById(Object.fromEntries(rows.map((r) => [r.id, r.name])));
  }, []);

  useEffect(() => {
    if (justUpgraded) {
      router.replace(`/salon/${salonProfile.place_id}/dashboard`);
    }
  }, [justUpgraded, router, salonProfile.place_id]);

  useEffect(() => {
    const sections = DASHBOARD_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const ratios = new Map<string, number>(
      DASHBOARD_SECTION_IDS.map((id) => [id, 0]),
    );
    const updateActiveSection = () => {
      let next: DashboardSectionId = DASHBOARD_SECTION_IDS[0];
      let bestRatio = -1;

      for (const id of DASHBOARD_SECTION_IDS) {
        const ratio = ratios.get(id) ?? 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          next = id;
        }
      }

      // When no section meaningfully intersects, fall back to nearest section above fold.
      if (bestRatio <= 0) {
        const crossed = DASHBOARD_SECTION_IDS.filter((id) => {
          const el = document.getElementById(id);
          return el ? el.getBoundingClientRect().top <= 150 : false;
        });
        next = crossed.at(-1) ?? DASHBOARD_SECTION_IDS[0];
      }

      setActiveSection((prev) => (prev === next ? prev : next));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(
            (entry.target as HTMLElement).id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }
        updateActiveSection();
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
    );

    sections.forEach((section) => observer.observe(section));
    updateActiveSection();

    return () => observer.disconnect();
  }, []);

  function handleSectionTabClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: DashboardSectionId,
  ) {
    e.preventDefault();
    setActiveSection(sectionId);

    const target = document.getElementById(sectionId);
    if (!target) return;

    // Keep section headings visible below sticky top UI on desktop (nav ~56px + top-6 + margin).
    const stickyOffset = 112;
    const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    window.history.replaceState(null, "", `#${sectionId}`);
  }

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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      {/* Mobile: back to public salon; desktop uses section tabs below */}
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
      {/* Success banner after claiming */}
      {showClaimed && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Claim submitted!
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
              You can start managing your page now. We will verify your
              ownership within 48 hours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowClaimed(false)}
            className="mt-0.5 text-[color:var(--brand-primary)] hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success banner after upgrading */}
      {showUpgraded && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-[color:var(--brand-primary-surface)] px-4 py-3 ring-1 ring-[color:var(--brand-primary-muted)]">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Subscription active!
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
              Your salon plan has been upgraded. Thank you!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgraded(false)}
            className="mt-0.5 text-[color:var(--brand-primary)] hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {ownerSalons.length > 1 ? (
        <div className="mb-5 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
          <label
            htmlFor="dashboard-salon-switcher"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
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

      <nav
        className="sticky top-6 z-20 mb-6 hidden rounded-2xl border border-zinc-200/70 bg-white/85 p-1.5 backdrop-blur supports-[backdrop-filter]:bg-white/70 lg:block dark:border-zinc-700/70 dark:bg-zinc-900/80 dark:supports-[backdrop-filter]:bg-zinc-900/70"
        aria-label="Dashboard sections"
      >
        <div className="relative grid min-w-[22rem] grid-cols-3 items-center gap-1">
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 top-0 z-0 rounded-xl bg-zinc-100 shadow-sm ring-1 ring-zinc-200/60 transition-transform duration-250 ease-out dark:bg-zinc-800 dark:ring-zinc-700/70"
            style={{
              width: "calc((100% - 0.5rem) / 3)",
              transform: `translateX(calc(${activeSectionIndex} * (100% + 0.25rem)))`,
            }}
          />
          <a
            href="#dashboard-overview"
            onClick={(e) => handleSectionTabClick(e, "dashboard-overview")}
            aria-current={activeSection === "dashboard-overview" ? "page" : undefined}
            className={`relative z-10 rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${
              activeSection === "dashboard-overview"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            Dashboard
          </a>
          <a
            href="#analytics"
            onClick={(e) => handleSectionTabClick(e, "analytics")}
            aria-current={activeSection === "analytics" ? "page" : undefined}
            className={`relative z-10 rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${
              activeSection === "analytics"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            Analytics
          </a>
          <a
            href="#settings"
            onClick={(e) => handleSectionTabClick(e, "settings")}
            aria-current={activeSection === "settings" ? "page" : undefined}
            className={`relative z-10 rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${
              activeSection === "settings"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            Settings
          </a>
        </div>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-x-0 lg:gap-y-6">
        <section
          id="dashboard-overview"
          className="min-w-0 space-y-5 scroll-mt-28 lg:pr-8"
        >
          {/* Sales summary card */}
          <div className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
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
              <div className="min-w-0 flex-1">
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
                    className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-2 py-1 text-lg font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-primary-surface)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-primary)] ring-1 ring-[color:var(--brand-primary-muted)]">
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-primary-surface)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-primary)] ring-1 ring-[color:var(--brand-primary-muted)]">
                      Salon Basic — €9/mo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      Free plan
                    </span>
                  )}
                  <Link
                    href={`/salon/${salonProfile.place_id}`}
                    className="text-xs text-[color:var(--brand-primary)] hover:underline"
                  >
                    View public page →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Active monthly log summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total visits", value: stats.totalVisits.toString() },
              {
                label: "Avg rating",
                value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—",
              },
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

          {/* Analytics + flavour insights */}
          <div id="analytics" className="scroll-mt-28 space-y-5">
            <AnalyticsSection
              tier={tier}
              placeId={salonProfile.place_id}
              weeklyVisits={weeklyVisits}
              topFlavours={topFlavours}
              weatherStats={weatherStats}
              monthlyRatings={monthlyRatings}
            />

            {peakGrid && (tier === "basic" || tier === "pro") && (
              <PeakTimesCard peak={peakGrid} />
            )}

            <FlavourInsightsCollapsibleSection
              tier={tier}
              placeId={salonProfile.place_id}
              flavourInsights={flavourInsights}
            />

            {/* Log cleanup history — synced from flavour board toggles */}
            {tier === "pro" ? (
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
                <button
                  type="button"
                  onClick={() => setVisibilityHistoryOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  aria-expanded={visibilityHistoryOpen}
                >
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Log cleanup history
                  </span>
                  <span
                    className={`inline-block shrink-0 text-zinc-400 transition-transform duration-200 ease-out dark:text-zinc-500 ${
                      visibilityHistoryOpen ? "rotate-90" : ""
                    }`}
                    aria-hidden
                  >
                    ▶
                  </span>
                </button>
                <div
                  id="dashboard-visibility-history-panel"
                  aria-hidden={!visibilityHistoryOpen}
                  className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                    visibilityHistoryOpen ? "max-h-[4000px]" : "max-h-0"
                  } ${!visibilityHistoryOpen ? "pointer-events-none" : ""}`}
                >
                  <div className="border-t border-zinc-100 px-6 pb-5 pt-3 dark:border-zinc-800">
                    <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
                      {visibilityLog.length === 0 ? (
                        <li className="text-zinc-400 dark:text-zinc-500">No changes yet.</li>
                      ) : (
                        visibilityLog.map((r) => {
                          const name = flavourNameById[r.flavour_id] ?? "Flavour";
                          return (
                            <li key={r.id} className="text-zinc-600 dark:text-zinc-300">
                              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                {name}
                              </span>
                              {" — "}
                              {r.set_visible ? (
                                <span className="text-[color:var(--brand-primary)]">shown</span>
                              ) : (
                                <span className="text-zinc-500">hidden</span>
                              )}
                              <span
                                className="text-zinc-400 dark:text-zinc-500"
                                title={r.changed_at}
                              >
                                {" · "}
                                {formatVisibilityLogInstant(r.changed_at)}
                              </span>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Log cleanup</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Visibility history and cleanup tools are available on Salon Pro.
                </p>
                <a
                  href="#billing"
                  className="mt-3 inline-block text-xs font-medium text-[color:var(--brand-primary)] hover:underline"
                >
                  View billing & plans
                </a>
              </div>
            )}
          </div>
        </section>

        <aside
          id="settings"
          className="min-w-0 scroll-mt-28 lg:sticky lg:top-6 lg:self-start lg:border-l lg:border-zinc-200/80 lg:pl-8 dark:lg:border-zinc-800"
        >
          <div className="space-y-4 rounded-3xl bg-zinc-50/80 p-3 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.7)] ring-1 ring-zinc-200/70 dark:bg-zinc-900/60 dark:ring-zinc-700/70 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
            <div className="space-y-4 [&>*]:mb-0">
              <SalonDashboardWeatherCard weather={dashboardWeather} hasCoordinates={salonHasCoordinates} />

              {/* Weekly flavour board */}
              <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
                <FlavourBoard
                  placeId={salonProfile.place_id}
                  initialFlavours={initialVitrineFlavours}
                  initialSuggestions={initialSuggestions}
                  onVisibilityLogAppend={handleVisibilityLogAppend}
                  onFlavoursSnapshot={handleFlavoursSnapshot}
                />
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
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                    />
                    <p className="text-right text-xs text-zinc-400">{bio.length}/280</p>
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
                      placeholder="+31 6 00 000 000"
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
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
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Logo hint */}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    To update your logo, tap the image in the header above.
                    {logoFile && (
                      <span className="ml-1 font-medium text-[color:var(--brand-primary)]">
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
                    className="inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-muted)] focus:ring-offset-2 focus:ring-offset-white disabled:opacity-60 dark:focus:ring-offset-zinc-950"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>

                  {saved && (
                    <p className="text-center text-xs text-[color:var(--brand-primary)]">
                      Saved ✓
                    </p>
                  )}
                </form>
              </div>

              {/* Opening hours */}
              <OpeningHoursEditor placeId={salonProfile.place_id} />

              {/* Billing */}
              <div
                id="billing"
                className="scroll-mt-28 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
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
                        <th className="px-3 py-2 text-center font-semibold text-[color:var(--brand-primary)]">
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
                          <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{feature}</td>
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
                    className="bg-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-hover)]"
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
                    {new Date(salonProfile.salon_subscription_expires_at).toLocaleDateString(
                      "en-GB",
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
