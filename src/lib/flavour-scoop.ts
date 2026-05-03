"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

const DEFAULT_SLUG = "strawberry";
const DEFAULT_BASE_COLOR = "#F9A8D4";
const DEFAULT_SHINE_COLOR = "#BC606D";
const DEFAULT_ACCENT_COLOR = "#FFF0F5";

export type FlavourScoopVisual = {
  scoopUrl: string;
  baseColor: string;
  shineColor: string;
  accentColor: string;
  loading: boolean;
  slug: string;
  label: string;
};

type FlavourRow = {
  name: string;
  slug: string;
  base_color: string;
  shine_color: string;
  accent_color: string;
};

/**
 * Convert a flavour label into a URL-safe slug.
 * Ex: "Cookie Dough" -> "cookie-dough"
 */
export function mapFlavourToSlug(name?: string): string {
  const fallback = DEFAULT_SLUG;
  if (!name) return fallback;

  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || fallback;
}

export function getFlavourScoopUrl(slug: string): string {
  const safeSlug = slug?.trim() ? slug.trim() : DEFAULT_SLUG;
  return `/assets/scoops/${safeSlug}.svg`;
}

/**
 * Resolve scoop visual metadata for a flavour name.
 * Falls back gracefully to strawberry when rows are missing.
 */
export function useFlavourScoop(flavourName?: string): FlavourScoopVisual {
  const slug = useMemo(() => mapFlavourToSlug(flavourName), [flavourName]);
  const [row, setRow] = useState<FlavourRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFlavourRow(targetSlug: string): Promise<void> {
      if (!cancelled) setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("flavours")
        .select("name, slug, base_color, shine_color, accent_color")
        .eq("slug", targetSlug)
        .maybeSingle<FlavourRow>();

      if (cancelled) return;

      if (!error && data) {
        setRow(data);
        setLoading(false);
        return;
      }

      if (targetSlug !== DEFAULT_SLUG) {
        await loadFlavourRow(DEFAULT_SLUG);
        return;
      }

      setRow(null);
      setLoading(false);
    }

    void loadFlavourRow(slug);

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const visualSlug = row?.slug ?? (slug || DEFAULT_SLUG);
  const label = row?.name ?? (flavourName?.trim() || "Strawberry");

  return {
    scoopUrl: getFlavourScoopUrl(visualSlug),
    baseColor: row?.base_color ?? DEFAULT_BASE_COLOR,
    shineColor: row?.shine_color ?? DEFAULT_SHINE_COLOR,
    accentColor: row?.accent_color ?? DEFAULT_ACCENT_COLOR,
    loading,
    slug: visualSlug,
    label,
  };
}
