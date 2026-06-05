import Link from "next/link";
import type { ReactNode } from "react";
import { LegalBackButton } from "@/src/components/LegalBackButton";

type LegalDocumentShellProps = {
  title: string;
  otherDocHref: string;
  otherDocLabel: string;
  children: ReactNode;
};

export function LegalDocumentShell({
  title,
  otherDocHref,
  otherDocLabel,
  children,
}: LegalDocumentShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text-primary)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--border-default)] bg-[color:var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--background)]/80 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-12 max-w-[720px] items-center justify-between px-6">
          <LegalBackButton />
          <Link
            href="/feed"
            className="text-sm font-semibold tracking-tight text-[color:var(--brand-secondary)] transition-colors hover:text-[color:var(--brand-primary)]"
          >
            Gellog
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[720px] px-6 py-10 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
          Last updated: 9 April 2026
        </p>

        <div
          className="my-8 h-px w-full bg-[color:var(--brand-secondary)]"
          aria-hidden
        />

        {children}

        <footer className="mt-10 flex flex-col gap-3 border-t border-[color:var(--border-default)] pt-8 text-sm text-[color:var(--text-secondary)] sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/feed"
            className="font-medium text-[color:var(--brand-secondary)] underline-offset-2 transition-colors hover:text-[color:var(--brand-primary)] hover:underline"
          >
            Back to feed
          </Link>
          <Link
            href={otherDocHref}
            className="font-medium text-[color:var(--brand-secondary)] underline-offset-2 transition-colors hover:text-[color:var(--brand-primary)] hover:underline"
          >
            {otherDocLabel}
          </Link>
        </footer>
      </div>
    </div>
  );
}
