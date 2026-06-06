import { describe, expect, it, vi } from "vitest";
import { createMockSupabase } from "@/src/test-helpers/mockSupabase";
import { searchCanonicalFlavours } from "./canonical-flavour-search";

function mockFlavourQuery(rows: Array<{ id: string; name_en?: string; name_nl?: string; name_it?: string }>) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }),
  };
}

describe("searchCanonicalFlavours", () => {
  it("returns an empty list for short queries", async () => {
    const supabase = createMockSupabase();
    await expect(searchCanonicalFlavours(supabase, "a")).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deduplicates results across language columns", async () => {
    const supabase = createMockSupabase();
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table !== "flavours") throw new Error(`unexpected table ${table}`);
      return mockFlavourQuery([
        { id: "fl-1", name_en: "Strawberry", name_nl: "Aardbei", name_it: "Fragola" },
      ]) as never;
    });

    const results = await searchCanonicalFlavours(supabase, "straw");

    expect(results).toEqual([{ id: "fl-1", label: "Strawberry" }]);
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });
});
