import Link from "next/link";

/** Reserved space for the fixed public CTA (tune if banner layout changes). */
export const PUBLIC_BANNER_LAYOUT_PX = 96;

export type PublicBannerProps = {
  variant: "log" | "profile" | "salon";
  /** Profile handle (e.g. URL username), shown as @handle in copy. */
  profileHandle?: string | null;
  /** Salon display name for the salon variant. */
  salonName?: string | null;
};

export function PublicBanner({ variant, profileHandle, salonName }: PublicBannerProps) {
  const handle = profileHandle?.replace(/^@/, "").trim() ?? "";
  const copy =
    variant === "log"
      ? "Log your own gelato adventures → Join Gellog"
      : variant === "profile"
        ? `Follow ${handle ? `@${handle}` : "this user"} on Gellog → Join Gellog`
        : `Log your visit to ${salonName?.trim() || "this salon"} → Join Gellog`;

  return (
    <div
      role="region"
      aria-label="Join Gellog"
      className="fixed bottom-0 left-0 right-0 z-[35] border-t border-[color:var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_96%,transparent)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)]"
    >
      <div className="mx-auto flex max-w-xl flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-center text-sm font-medium leading-snug text-[color:var(--color-text-primary)] sm:text-left">
          {copy}
        </p>
        <Link
          href="/signup"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[color:var(--color-orange)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-on-brand)] shadow-sm transition hover:brightness-110"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
