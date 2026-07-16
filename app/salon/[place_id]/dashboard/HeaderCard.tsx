"use client";

import Image from "next/image";
import Link from "next/link";
import type { RefObject } from "react";

type Tier = "free" | "basic" | "pro";

type Props = {
  placeId: string;
  salonName: string;
  claimVerified: boolean;
  tier: Tier;
  editingName: boolean;
  nameInput: string;
  onNameInputChange: (v: string) => void;
  onStartEditName: () => void;
  onSaveName: () => void;
  onCancelEditName: () => void;
  displayLogoUrl: string | null;
  logoImgError: boolean;
  onLogoImgError: () => void;
  onLogoClick: () => void;
  logoInputRef: RefObject<HTMLInputElement | null>;
  onLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function HeaderCard({
  placeId,
  salonName,
  claimVerified,
  tier,
  editingName,
  nameInput,
  onNameInputChange,
  onStartEditName,
  onSaveName,
  onCancelEditName,
  displayLogoUrl,
  logoImgError,
  onLogoImgError,
  onLogoClick,
  logoInputRef,
  onLogoFileChange,
}: Props) {
  return (
    <div className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="flex items-start gap-4">
        <button type="button" onClick={onLogoClick} className="group relative flex-shrink-0">
          {displayLogoUrl && !logoImgError ? (
            <Image
              src={displayLogoUrl}
              alt={salonName}
              width={60}
              height={60}
              className="rounded-2xl object-cover ring-1 ring-zinc-100 dark:ring-zinc-800"
              loading="lazy"
              onError={onLogoImgError}
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
          onChange={onLogoFileChange}
        />

        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => onNameInputChange(e.target.value)}
              onBlur={onSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveName();
                if (e.key === "Escape") onCancelEditName();
              }}
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-2 py-1 text-lg font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          ) : (
            <button type="button" onClick={onStartEditName} className="group flex items-center gap-1.5 text-left">
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{salonName}</span>
              <span className="text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 dark:text-zinc-500">
                ✏️
              </span>
            </button>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {claimVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-primary-surface)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-primary)] ring-1 ring-[color:var(--brand-primary-muted)]">
                ✓ Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Pending verification
              </span>
            )}
            {tier === "pro" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-primary-surface)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-primary)] ring-1 ring-[color:var(--brand-primary-muted)]">
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
              href={`/salon/${placeId}`}
              className="text-xs text-[color:var(--brand-primary)] hover:underline"
            >
              View public page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
