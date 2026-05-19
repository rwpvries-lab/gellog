import type { SupabaseClient } from "@supabase/supabase-js";

export type CanonicalFlavourPick = {
  id: string;
  label: string;
};

/**
 * Fuzzy search against `public.flavours` for manual log entry (canonical names).
 * Supplements DB `resolve_flavour()` with a browsable list while typing.
 */
export async function searchCanonicalFlavours(
  supabase: SupabaseClient,
  query: string,
): Promise<CanonicalFlavourPick[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q.replace(/%/g, "\\%")}%`;

  const [{ data: en }, { data: nl }, { data: it }] = await Promise.all([
    supabase
      .from("flavours")
      .select("id, name_en, name_nl, name_it")
      .eq("is_active", true)
      .not("base_token", "is", null)
      .ilike("name_en", pattern)
      .limit(8),
    supabase
      .from("flavours")
      .select("id, name_en, name_nl, name_it")
      .eq("is_active", true)
      .not("base_token", "is", null)
      .ilike("name_nl", pattern)
      .limit(8),
    supabase
      .from("flavours")
      .select("id, name_en, name_nl, name_it")
      .eq("is_active", true)
      .not("base_token", "is", null)
      .ilike("name_it", pattern)
      .limit(8),
  ]);

  const map = new Map<string, CanonicalFlavourPick>();
  function add(row: { id: string; name_en?: string | null; name_nl?: string | null; name_it?: string | null }) {
    const label =
      row.name_nl?.trim() ||
      row.name_en?.trim() ||
      row.name_it?.trim() ||
      "Flavour";
    if (!map.has(row.id)) {
      map.set(row.id, { id: row.id, label });
    }
  }
  for (const row of en ?? []) add(row as { id: string; name_en?: string | null; name_nl?: string | null; name_it?: string | null });
  for (const row of nl ?? []) add(row as { id: string; name_en?: string | null; name_nl?: string | null; name_it?: string | null });
  for (const row of it ?? []) add(row as { id: string; name_en?: string | null; name_nl?: string | null; name_it?: string | null });

  return Array.from(map.values()).slice(0, 10);
}
