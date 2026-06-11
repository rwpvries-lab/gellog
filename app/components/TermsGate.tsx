"use client";

import { useEffect, useState } from "react";
import { GellogLogo } from "@/app/components/GellogLogo";
import { getTermsAccepted, setTermsAccepted } from "@/src/lib/terms-acceptance";
import { openExternal } from "@/src/lib/open-external";

/**
 * One-time Terms of Use + Privacy acceptance screen shown before the login/signup
 * form (Apple Guideline 1.2 — EULA / acknowledgement of UGC rules). Once accepted
 * it is stored persistently and never shown again, so children render directly.
 */
export function TermsGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "needed" | "accepted">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    void getTermsAccepted().then((accepted) => {
      if (!cancelled) setStatus(accepted ? "accepted" : "needed");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleOpen(path: string) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://www.gellog.app";
    await openExternal(`${origin}${path}`);
  }

  async function handleAccept() {
    await setTermsAccepted();
    setStatus("accepted");
  }

  // Avoid flashing the gate before the stored value is read.
  if (status === "loading") return null;

  if (status === "accepted") return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--background-primary)] px-4 py-12">
      <main className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <GellogLogo size={88} priority />
        </div>

        <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Before you continue
          </h2>

          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            By using Gellog you agree to our Terms of Use and Privacy Policy.
            Please treat other users with respect.
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void handleOpen("/terms")}
              className="text-left text-sm font-medium text-[color:var(--color-orange)] underline-offset-2 hover:underline"
            >
              Read the Terms of Use →
            </button>
            <button
              type="button"
              onClick={() => void handleOpen("/privacy")}
              className="text-left text-sm font-medium text-[color:var(--color-orange)] underline-offset-2 hover:underline"
            >
              Read the Privacy Policy →
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleAccept()}
            className="mt-1 flex h-11 w-full items-center justify-center rounded-lg bg-[color:var(--color-orange)] px-4 text-sm font-semibold text-white transition hover:brightness-105"
          >
            I agree — continue
          </button>
        </div>
      </main>
    </div>
  );
}
