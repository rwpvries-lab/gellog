import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  DevGelatoFlavourGrid,
  DevGelatoFlavourGridFallback,
  pillHref,
  type Category,
} from "./DevGelatoFlavourGrid";

type Mode = "light" | "dark";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toMode(raw: string | undefined): Mode {
  return raw === "dark" ? "dark" : "light";
}

function toCategory(raw: string | undefined): Category {
  if (
    raw === "classic" ||
    raw === "modern" ||
    raw === "fruit" ||
    raw === "sorbet" ||
    raw === "all"
  ) {
    return raw;
  }
  return "all";
}

/** Avoid prerender / cache mismatches with streamed client content (hydration). */
export const dynamic = "force-dynamic";

export default async function DevGelatoPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = (await searchParams) ?? {};
  const mode = toMode(normalizeParam(params.mode));
  const activeCategory = toCategory(normalizeParam(params.category));

  const pageBg =
    mode === "dark"
      ? "bg-zinc-950 text-zinc-100"
      : "bg-zinc-50 text-zinc-900";
  const cardBg =
    mode === "dark"
      ? "bg-zinc-900 ring-zinc-800"
      : "bg-white ring-zinc-200";
  const subText = mode === "dark" ? "text-zinc-400" : "text-zinc-500";
  const controlsBg =
    mode === "dark"
      ? "bg-zinc-900 ring-zinc-800"
      : "bg-white ring-zinc-200";

  return (
    <main className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5">
        <header className={`rounded-2xl p-4 ring-1 ${controlsBg}`}>
          <h1 className="text-xl font-semibold">Gelato Dev Playground</h1>
          <p className={`mt-1 text-sm ${subText}`}>
            Flavours load from Supabase in the grid below (may take a moment on first open).
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium ${subText}`}>Mode:</span>
            <Link
              href={pillHref("light", activeCategory)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                mode === "light"
                  ? "bg-amber-300/90 text-zinc-900 ring-amber-300"
                  : "bg-transparent ring-zinc-400/40"
              }`}
            >
              Light
            </Link>
            <Link
              href={pillHref("dark", activeCategory)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                mode === "dark"
                  ? "bg-zinc-700 text-zinc-50 ring-zinc-500"
                  : "bg-transparent ring-zinc-400/40"
              }`}
            >
              Dark
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium ${subText}`}>Category:</span>
            {(["all", "classic", "modern", "fruit", "sorbet"] as const).map((cat) => (
              <Link
                key={cat}
                href={pillHref(mode, cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ${
                  activeCategory === cat
                    ? "bg-teal-500 text-white ring-teal-500"
                    : "bg-transparent ring-zinc-400/40"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </header>

        <Suspense
          fallback={
            <DevGelatoFlavourGridFallback cardBg={cardBg} subText={subText} />
          }
        >
          <DevGelatoFlavourGrid
            activeCategory={activeCategory}
            cardBg={cardBg}
            subText={subText}
          />
        </Suspense>
      </div>
    </main>
  );
}
