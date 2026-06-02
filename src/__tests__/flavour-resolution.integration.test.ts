/**
 * Integration tests for the Supabase DB functions:
 *   - public.parse_compound_flavour(input text)
 *   - public.resolve_flavour(input text)
 *   - public.resolve_flavour_tokens(input text)  [orchestrates the above]
 *
 * These tests require a running Supabase project.
 * Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run them.
 *
 * Confirmed expected values from the live DB on 2026-06-01.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const hasCredentials = supabaseUrl.length > 0 && supabaseKey.length > 0;

const runOrSkip = hasCredentials ? describe : describe.skip;

runOrSkip("parse_compound_flavour DB function", () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  async function parseCompound(input: string) {
    const { data, error } = await supabase.rpc("parse_compound_flavour", { input });
    if (error) throw error;
    return (data as { base_token: string | null; drizzle_token: string | null; crumble_token: string | null }[])[0];
  }

  it("single-word base match returns base token", async () => {
    const row = await parseCompound("chocolate");
    expect(row.base_token).toBe("chocolate-brown");
    expect(row.drizzle_token).toBeNull();
    expect(row.crumble_token).toBeNull();
  });

  it("compound 'mango yogurt' — yogurt is base, mango is drizzle modifier", async () => {
    const row = await parseCompound("mango yogurt");
    // 'yogurt' word → base 'coconut-white'; 'mango' word → drizzle modifier 'mango-swirl'
    expect(row.base_token).toBe("coconut-white");
    expect(row.drizzle_token).toBe("mango-swirl");
    expect(row.crumble_token).toBeNull();
  });

  it("compound 'strawberry yogurt' — yogurt is base, strawberry is drizzle modifier", async () => {
    const row = await parseCompound("strawberry yogurt");
    expect(row.base_token).toBe("coconut-white");
    expect(row.drizzle_token).toBe("strawberry-swirl");
    expect(row.crumble_token).toBeNull();
  });

  it("compound 'coffee cinnamon' — coffee is base, cinnamon is crumble modifier", async () => {
    const row = await parseCompound("coffee cinnamon");
    expect(row.base_token).toBe("coffee-mocha");
    expect(row.drizzle_token).toBeNull();
    expect(row.crumble_token).toBe("biscuit-bits");
  });

  it("unknown word returns null tokens (no-match)", async () => {
    const row = await parseCompound("xyzqqqzzz");
    expect(row.base_token).toBeNull();
    expect(row.drizzle_token).toBeNull();
    expect(row.crumble_token).toBeNull();
  });
});

runOrSkip("resolve_flavour DB function", () => {
  let supabase: ReturnType<typeof createClient>;
  let strawberryId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    // Fetch the canonical strawberry ID to assert against
    const { data } = await supabase
      .from("flavours")
      .select("id")
      .eq("slug", "strawberry")
      .single();
    strawberryId = (data as { id: string }).id;
  });

  async function resolveId(input: string) {
    const { data, error } = await supabase.rpc("resolve_flavour", { input });
    if (error) throw error;
    return data as string | null;
  }

  it("resolves slug 'strawberry' to its canonical UUID", async () => {
    const id = await resolveId("strawberry");
    expect(id).toBe(strawberryId);
  });

  it("resolves Dutch name 'aardbei' to the same UUID as slug 'strawberry'", async () => {
    const id = await resolveId("aardbei");
    expect(id).toBe(strawberryId);
  });

  it("fuzzy match 'choclate' resolves to the Chocolate flavour", async () => {
    const id = await resolveId("choclate");
    const { data } = await supabase.from("flavours").select("name_en").eq("id", id!).single();
    expect((data as { name_en: string }).name_en).toBe("Chocolate");
  });

  it("empty string returns null", async () => {
    const id = await resolveId("");
    expect(id).toBeNull();
  });

  it("gibberish below similarity threshold returns null", async () => {
    const id = await resolveId("xyzqqqzzz");
    expect(id).toBeNull();
  });
});

runOrSkip("resolve_flavour_tokens DB function", () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  async function resolveTokens(input: string) {
    const { data, error } = await supabase.rpc("resolve_flavour_tokens", { input });
    if (error) throw error;
    return (data as {
      flavour_id: string | null;
      base_token: string;
      drizzle_token: string;
      crumble_token: string;
      source: string | null;
    }[])[0];
  }

  it("single word 'strawberry' resolves via exact match (Layer 1)", async () => {
    const row = await resolveTokens("strawberry");
    expect(row.base_token).toBe("strawberry-pink");
    expect(row.drizzle_token).toBe("none");
    expect(row.crumble_token).toBe("fruit-chunks-red");
    expect(row.source).toBe("system");
    expect(row.flavour_id).not.toBeNull();
  });

  it("'mango yogurt' resolves via compound parser (Layer 2)", async () => {
    const row = await resolveTokens("mango yogurt");
    expect(row.base_token).toBe("coconut-white");
    expect(row.drizzle_token).toBe("mango-swirl");
    expect(row.crumble_token).toBe("none");
    expect(row.source).toBe("compound");
    expect(row.flavour_id).toBeNull();
  });

  it("'strawberry yogurt' resolves via compound parser (Layer 2)", async () => {
    const row = await resolveTokens("strawberry yogurt");
    expect(row.base_token).toBe("coconut-white");
    expect(row.drizzle_token).toBe("strawberry-swirl");
    expect(row.crumble_token).toBe("none");
    expect(row.source).toBe("compound");
  });

  it("typo 'choclate' resolves via fuzzy trigram match (Layer 3)", async () => {
    const row = await resolveTokens("choclate");
    expect(row.base_token).toBe("chocolate-brown");
    expect(row.source).toBe("system");
    expect(row.flavour_id).not.toBeNull();
  });

  it("gibberish 'xyzqqqzzz' falls through to default cream (Layer 4)", async () => {
    const row = await resolveTokens("xyzqqqzzz");
    expect(row.base_token).toBe("cream");
    expect(row.drizzle_token).toBe("none");
    expect(row.crumble_token).toBe("none");
    expect(row.flavour_id).toBeNull();
    expect(row.source).toBeNull();
  });

  it("empty string returns default cream tokens", async () => {
    const row = await resolveTokens("");
    expect(row.base_token).toBe("cream");
    expect(row.drizzle_token).toBe("none");
    expect(row.crumble_token).toBe("none");
  });

  // owner_defined rows take priority in Layer 1 (ORDER BY (source = 'owner_defined') DESC)
  // Cannot assert without seeding a fixture row; tested by code inspection only.
  it.todo("owner_defined source beats system source on exact match — requires fixture row");
});
