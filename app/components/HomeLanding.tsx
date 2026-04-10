import Link from "next/link";
import { GellogLogo } from "./GellogLogo";
import { BookMarked, Map, UsersRound } from "lucide-react";

const brandOrange = "#D97706";
const brandTeal = "#0D9488";

const steps = [
  { title: "Log your gelato", description: "Capture flavours, spots, and moments in one place." },
  { title: "Discover salons", description: "Find great gelato near you and see what others love." },
  { title: "Connect with friends", description: "Share logs and build your gelato circle." },
] as const;

const featureCards = [
  {
    title: "Your gelato diary",
    description: "A calm log for every scoop — notes, places, and photos that stay organized.",
    icon: BookMarked,
    gradient: `linear-gradient(145deg, color-mix(in srgb, ${brandTeal} 18%, transparent), color-mix(in srgb, ${brandOrange} 12%, transparent))`,
  },
  {
    title: "Salons on the map",
    description: "Browse salons, see activity, and save the ones you want to visit next.",
    icon: Map,
    gradient: `linear-gradient(145deg, color-mix(in srgb, ${brandOrange} 16%, transparent), color-mix(in srgb, ${brandTeal} 14%, transparent))`,
  },
  {
    title: "Social by design",
    description: "Follow friends, compare tastes, and discover flavours through people you trust.",
    icon: UsersRound,
    gradient: `linear-gradient(145deg, color-mix(in srgb, ${brandTeal} 14%, transparent), color-mix(in srgb, ${brandOrange} 14%, transparent))`,
  },
] as const;

export function HomeLanding() {
  return (
    <div className="min-h-screen bg-[color:var(--color-surface)] text-[color:var(--color-text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--background)_72%,transparent)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Gellog home">
            <GellogLogo size={40} priority />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-[color:var(--color-text-secondary)] transition-colors hover:text-[#0D9488]"
          >
            Log in
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] sm:text-sm"
              style={{ color: brandTeal }}
            >
              Gelato · Logger
            </p>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl sm:leading-tight md:text-5xl">
              The app for people who{" "}
              <span style={{ color: brandOrange }}>really</span> care about gelato.
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-[color:var(--color-text-secondary)] sm:text-lg">
              Gellog is your pocket diary for gelato: log tastings, explore salons,
              and connect with friends — without noise.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full px-10 text-base font-semibold text-white shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                style={{ backgroundColor: brandTeal }}
              >
                Start logging
              </Link>
            </div>
          </div>
        </section>

        <section
          className="border-y border-[color:var(--color-border)] py-16 sm:py-20"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${brandTeal} 6%, var(--color-surface)) 0%, var(--color-surface) 48%, color-mix(in srgb, ${brandOrange} 5%, var(--color-surface)) 100%)`,
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-[color:var(--color-text-secondary)] sm:text-base">
              Three steps from first scoop to your gelato world.
            </p>
            <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {steps.map((step, i) => (
                <li key={step.title} className="relative flex flex-col items-center text-center">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
                    style={{
                      background:
                        i === 1
                          ? `linear-gradient(135deg, ${brandOrange}, color-mix(in srgb, ${brandOrange} 65%, ${brandTeal}))`
                          : i === 0
                            ? brandTeal
                            : `linear-gradient(135deg, ${brandTeal}, color-mix(in srgb, ${brandTeal} 70%, ${brandOrange}))`,
                    }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            A quick look
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-[color:var(--color-text-secondary)] sm:text-base">
            Built to feel light, intentional, and a little premium.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--background)] shadow-sm"
                >
                  <div
                    className="relative aspect-[4/3] w-full"
                    style={{ background: card.gradient }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="rounded-2xl border border-white/40 bg-[color-mix(in_srgb,var(--background)_82%,transparent)] p-6 shadow-md backdrop-blur-sm dark:border-white/10"
                        aria-hidden
                      >
                        <Icon
                          className="h-14 w-14 sm:h-16 sm:w-16"
                          strokeWidth={1.25}
                          style={{ color: brandTeal }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="text-lg font-semibold">{card.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
                      {card.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="py-14 sm:py-16"
          style={{
            background: `linear-gradient(90deg, color-mix(in srgb, ${brandTeal} 12%, var(--color-surface)), color-mix(in srgb, ${brandOrange} 10%, var(--color-surface)))`,
          }}
        >
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Own a gelato salon? Claim your page for free
            </h2>
            <p className="mt-3 text-sm text-[color:var(--color-text-secondary)] sm:text-base">
              Show up on Gellog, connect with your guests, and keep your listing
              yours.
            </p>
            <div className="mt-8">
              <Link
                href="/search"
                className="inline-flex h-11 items-center justify-center rounded-full border-2 bg-[color:var(--background)] px-8 text-sm font-semibold transition-colors hover:bg-[color:var(--color-surface-alt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                style={{ borderColor: brandTeal, color: brandTeal }}
              >
                Find your salon
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--color-border)] bg-[color:var(--background)] py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/privacy"
              className="text-[color:var(--color-text-secondary)] transition-colors hover:text-[#0D9488]"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-[color:var(--color-text-secondary)] transition-colors hover:text-[#0D9488]"
            >
              Terms of Service
            </Link>
            <a
              href="mailto:support@gellog.app"
              className="text-[color:var(--color-text-secondary)] transition-colors hover:text-[#0D9488]"
            >
              support@gellog.app
            </a>
          </nav>
          <p className="text-xs text-[color:var(--color-text-tertiary)]">
            © {new Date().getFullYear()} Gellog
          </p>
        </div>
      </footer>
    </div>
  );
}
