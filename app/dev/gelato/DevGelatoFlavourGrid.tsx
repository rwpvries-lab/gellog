import Link from "next/link";
import { Gelato } from "@/src/components/Gelato/Gelato";
import { Vitrine } from "@/src/components/Gelato/variants/Vitrine";
import {
  BASE_TOKENS,
  CRUMBLE_TOKENS,
  DRIZZLE_TOKENS,
  type BaseToken,
  type CrumbleToken,
  type DrizzleToken,
  type GelatoTokens,
} from "@/src/lib/gelato-tokens";
import { createClient } from "@/src/lib/supabase/server";

type Mode = "light" | "dark";
type Category = "all" | "classic" | "modern" | "fruit" | "sorbet";

function isBaseToken(value: unknown): value is BaseToken {
  return typeof value === "string" && value in BASE_TOKENS;
}

function isDrizzleToken(value: unknown): value is DrizzleToken {
  return typeof value === "string" && value in DRIZZLE_TOKENS;
}

function isCrumbleToken(value: unknown): value is CrumbleToken {
  return typeof value === "string" && value in CRUMBLE_TOKENS;
}

function hashStringToUint32(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

function pickBySeed<T>(seed: string, list: readonly T[]): T {
  const idx = hashStringToUint32(seed) % list.length;
  return list[idx];
}

const BASE_KEYS = Object.keys(BASE_TOKENS) as BaseToken[];
const DRIZZLE_KEYS = Object.keys(DRIZZLE_TOKENS) as DrizzleToken[];
const CRUMBLE_KEYS = Object.keys(CRUMBLE_TOKENS) as CrumbleToken[];

function inferCategory(name: string, slug: string): Exclude<Category, "all"> {
  const text = `${name} ${slug}`.toLowerCase();
  if (text.includes("sorbet")) return "sorbet";
  if (
    text.includes("strawberry") ||
    text.includes("mango") ||
    text.includes("lemon") ||
    text.includes("raspberry") ||
    text.includes("blueberry") ||
    text.includes("fruit")
  ) {
    return "fruit";
  }
  if (
    text.includes("bubblegum") ||
    text.includes("yoghurt") ||
    text.includes("cookie") ||
    text.includes("nutella")
  ) {
    return "modern";
  }
  return "classic";
}

function resolveTokens(row: Record<string, unknown>, slug: string): GelatoTokens {
  const dbBase = row.base_token;
  const dbDrizzle = row.drizzle_token;
  const dbCrumble = row.crumble_token;

  return {
    base: isBaseToken(dbBase) ? dbBase : pickBySeed(`${slug}-base`, BASE_KEYS),
    drizzle: isDrizzleToken(dbDrizzle)
      ? dbDrizzle
      : pickBySeed(`${slug}-drizzle`, DRIZZLE_KEYS),
    crumble: isCrumbleToken(dbCrumble)
      ? dbCrumble
      : pickBySeed(`${slug}-crumble`, CRUMBLE_KEYS),
  };
}

function pillHref(mode: Mode, category: Category): string {
  return `/dev/gelato?mode=${mode}&category=${category}`;
}

type Props = {
  activeCategory: Category;
  cardBg: string;
  subText: string;
};

export async function DevGelatoFlavourGrid({ activeCategory, cardBg, subText }: Props) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("flavours").select("*").order("name", {
    ascending: true,
  });

  const rows = (data ?? []) as Record<string, unknown>[];
  const flavourCards = rows
    .map((row) => {
      const name = typeof row.name === "string" ? row.name : "Unnamed flavour";
      const nameEn =
        typeof row.name_en === "string" && row.name_en.trim() ? row.name_en.trim() : name;
      const slug = typeof row.slug === "string" ? row.slug : name.toLowerCase().replace(/\s+/g, "-");
      const rawCategory = typeof row.category === "string" ? row.category.toLowerCase() : null;
      const category: Exclude<Category, "all"> =
        rawCategory === "classic" ||
        rawCategory === "modern" ||
        rawCategory === "fruit" ||
        rawCategory === "sorbet"
          ? rawCategory
          : inferCategory(name, slug);
      return {
        name,
        nameEn,
        slug,
        category,
        tokens: resolveTokens(row, slug),
      };
    })
    .filter((row) => activeCategory === "all" || row.category === activeCategory)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return (
    <section className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {error ? (
        <p className={`col-span-full text-sm ${subText}`}>Could not load flavours from Supabase.</p>
      ) : (
        <>
          <p className={`col-span-full text-sm ${subText}`}>
            Loaded {flavourCards.length} flavour{flavourCards.length === 1 ? "" : "s"} from
            public.flavours.
          </p>
          {flavourCards.map((flavour) => (
            <article key={flavour.slug} className={`rounded-2xl p-4 ring-1 ${cardBg}`}>
              <div>
                <h2 className="text-sm font-semibold">{flavour.name}</h2>
                <p className={`mt-0.5 text-xs ${subText}`}>{flavour.slug}</p>
              </div>

              <div className="mt-4 flex items-end gap-3 overflow-x-auto pb-1">
                {(["scoop", "cone", "cup", "vitrine"] as const).map((variant) => (
                  <div
                    key={variant}
                    className={`flex flex-col items-center gap-1 ${
                      variant === "vitrine" ? "min-w-[140px]" : "min-w-[136px]"
                    }`}
                  >
                    <div className="flex w-full items-end justify-center">
                      {variant === "vitrine" ? (
                        <div className="w-[140px] shrink-0">
                          <Vitrine
                            flavours={[
                              {
                                id: flavour.slug,
                                displayName: flavour.nameEn,
                                tokens: flavour.tokens,
                              },
                            ]}
                            seed={`${flavour.slug}-vitrine`}
                          />
                        </div>
                      ) : (
                        <Gelato
                          variant={variant}
                          tokens={flavour.tokens}
                          size={120}
                          seed={`${flavour.slug}-${variant}`}
                        />
                      )}
                    </div>
                    <span className={`text-[11px] ${subText}`}>{variant}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </>
      )}
    </section>
  );
}

export function DevGelatoFlavourGridFallback({ cardBg, subText }: { cardBg: string; subText: string }) {
  return (
    <section className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <p className={`col-span-full text-sm ${subText}`}>Loading flavours…</p>
      <div className={`col-span-full rounded-2xl p-8 ring-1 ${cardBg}`}>
        <div className="mx-auto h-24 max-w-md animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-700/80" />
      </div>
    </section>
  );
}

export { pillHref };
export type { Mode, Category };
