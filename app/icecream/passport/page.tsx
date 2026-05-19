import { PlaceholderScoop } from "@/src/components/Gelato/PlaceholderScoop";
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
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-16 text-center bg-[color:var(--background-primary)]">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-[color:var(--border-default)] bg-[color:var(--surface-elevated)] px-8 py-10 shadow-[var(--shadow-card-sm)]">
        <PlaceholderScoop size={96} seed="passport-empty" />
        <h1 className="font-serif text-2xl font-medium text-[color:var(--text-primary)]">
          Your passport is empty
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-[color:var(--text-secondary)]">
          Log a gelato to start collecting stamps.
        </p>
        <Link
          href="/icecream/logs/new"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-6 py-3 text-sm font-semibold text-[color:var(--text-inverse)] transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-2"
        >
          Log your first gelato →
        </Link>
      </div>
    </main>
  );
}
