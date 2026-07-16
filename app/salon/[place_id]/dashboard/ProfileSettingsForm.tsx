"use client";

type Props = {
  bio: string;
  onBioChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  website: string;
  onWebsiteChange: (v: string) => void;
  pendingLogoFile: boolean;
  saving: boolean;
  saveError: string | null;
  saved: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function ProfileSettingsForm({
  bio,
  onBioChange,
  phone,
  onPhoneChange,
  website,
  onWebsiteChange,
  pendingLogoFile,
  saving,
  saveError,
  saved,
  onSubmit,
}: Props) {
  return (
    <div className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Profile settings</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Tell visitors about your salon…"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          <p className="text-right text-xs text-zinc-400">{bio.length}/280</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+31 6 00 000 000"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Website URL</label>
          <input
            type="url"
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            placeholder="https://yoursalon.com"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          To update your logo, tap the image in the header above.
          {pendingLogoFile && (
            <span className="ml-1 font-medium text-[color:var(--brand-primary)]">
              New logo selected — save to apply.
            </span>
          )}
        </p>

        {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-muted)] focus:ring-offset-2 focus:ring-offset-white disabled:opacity-60 dark:focus:ring-offset-zinc-950"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        {saved && <p className="text-center text-xs text-[color:var(--brand-primary)]">Saved ✓</p>}
      </form>
    </div>
  );
}
