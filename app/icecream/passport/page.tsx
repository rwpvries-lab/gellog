import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export default async function IceCreamPassportPlaceholderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/icecream/passport");
  }
  return (
    <main
      className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-16 text-center"
      style={{ background: "var(--color-surface-alt)" }}
    >
      <div
        className="rounded-3xl px-8 py-10"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Ice cream passport
        </h1>
        <p
          className="mt-3 max-w-sm text-sm leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          The full passport experience is coming soon. You&apos;ll collect stamps
          and explore your gelato journey here.
        </p>
      </div>
      <Link
        href="/icecream/profile"
        className="rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: "var(--color-teal)" }}
      >
        Back to profile
      </Link>
    </main>
  );
}
