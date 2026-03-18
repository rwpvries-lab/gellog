"use client";

import { createClient } from "@/src/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FlavourBoard, type Flavour, type Suggestion } from "./FlavourBoard";

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
  initialFlavours: Flavour[];
  initialSuggestions: Suggestion[];
};

export function DashboardClient({ salonProfile, stats, justClaimed, initialFlavours, initialSuggestions }: Props) {
  const router = useRouter();
  const [salonName, setSalonName] = useState(salonProfile.salon_name);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(salonProfile.salon_name);

  const [bio, setBio] = useState(salonProfile.bio ?? "");
  const [phone, setPhone] = useState(salonProfile.phone ?? "");
  const [website, setWebsite] = useState(salonProfile.website ?? "");

  const [logoUrl, setLogoUrl] = useState(salonProfile.logo_url);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showClaimed, setShowClaimed] = useState(justClaimed);

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
      const filePath = `${salonProfile.place_id}/${Date.now()}-${logoFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("salon-logos")
        .upload(filePath, logoFile, { upsert: true });
      if (uploadError) {
        setSaveError("Logo upload failed. Please try again.");
        setSaving(false);
        return;
      }
      newLogoPath = uploadData.path;
      setLogoUrl(newLogoPath);
      setLogoFile(null);
      setLogoPreview(null);
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

      {/* Header card */}
      <div className="mb-5 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="group relative flex-shrink-0"
          >
            {displayLogoUrl ? (
              <Image
                src={displayLogoUrl}
                alt={salonName}
                width={64}
                height={64}
                className="rounded-2xl object-cover ring-1 ring-zinc-100 dark:ring-zinc-800"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-2xl dark:bg-zinc-800">
                🍦
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

      {/* Vitrine Display — Coming Soon */}
      <div className="mb-5 rounded-3xl border border-zinc-200 bg-zinc-50 px-6 py-5 dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          🪟 Vitrine Display — Coming Soon
        </p>
        <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
          Let customers see your flavour cabinet inside the app. Your flavours
          above will appear as coloured tubs in a row. Launching Week 6.
        </p>
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
