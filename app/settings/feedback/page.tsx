import { AppShell } from "@/app/components/AppShell";
import { Icon } from "@/src/components/icons";
import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { FeedbackFormClient } from "./FeedbackFormClient";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell contained={false}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-4">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              flexShrink: 0,
            }}
            aria-label="Back to settings"
          >
            <Icon name="GellogBack" size={18} strokeWidth={2} />
          </Link>
          <h1
            style={{
              color: "var(--color-text-primary)",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Send feedback
          </h1>
        </div>

        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          Tell us what you love, what&apos;s broken, or what you wish existed.
        </p>

        <FeedbackFormClient userId={user?.id ?? null} />
      </div>
    </AppShell>
  );
}
