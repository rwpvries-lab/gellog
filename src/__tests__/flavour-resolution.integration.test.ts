/**
 * Integration tests for the Supabase DB functions:
 *   - public.parse_compound_flavour(input text)
 *   - public.resolve_flavour(input text)
 *   - public.resolve_flavour_tokens(input text)  [orchestrates the above]
 *
 * These tests require a running Supabase project.
 * Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run them.
 * The owner_defined priority test also needs SUPABASE_SERVICE_ROLE_KEY to seed/clean fixtures.
 *
 * Confirmed expected values from the live DB on 2026-06-01.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const hasCredentials = supabaseUrl.length > 0 && supabaseKey.length > 0;
const hasServiceRole = hasCredentials && serviceRoleKey.length > 0;

const runOrSkip = hasCredentials ? describe : describe.skip;
const runOwnerDefinedOrSkip = hasServiceRole ? describe : describe.skip;

/** Isolated catalogue row — never touches production flavours like strawberry. */
const OWNER_PRIORITY_TEST_NAME = "Gellog Owner Priority Test";
const OWNER_PRIORITY_TEST_SLUG = "gellog-owner-priority-test";

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
});

runOwnerDefinedOrSkip("resolve_flavour_tokens owner_defined priority", () => {
  let supabase: ReturnType<typeof createClient>;
  let admin: ReturnType<typeof createClient>;
  let fixtureFlavourId: string | null = null;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await admin.from("flavours").delete().eq("slug", OWNER_PRIORITY_TEST_SLUG);

    const { data: inserted, error: insertError } = await admin
      .from("flavours")
      .insert({
        name: OWNER_PRIORITY_TEST_NAME,
        slug: OWNER_PRIORITY_TEST_SLUG,
        name_en: OWNER_PRIORITY_TEST_NAME,
        base_token: "strawberry-pink",
        drizzle_token: "none",
        crumble_token: "fruit-chunks-red",
        source: "system",
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      throw insertError ?? new Error("Failed to seed owner_defined test flavour.");
    }
    fixtureFlavourId = inserted.id as string;
  });

  afterAll(async () => {
    if (fixtureFlavourId) {
      await admin.from("flavours").delete().eq("id", fixtureFlavourId);
    }
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

  it("resolves the seeded row as system before promotion", async () => {
    const row = await resolveTokens(OWNER_PRIORITY_TEST_NAME);

    expect(row.source).toBe("system");
    expect(row.flavour_id).toBe(fixtureFlavourId);
    expect(row.base_token).toBe("strawberry-pink");
  });

  it("owner_defined promotion replaces system tokens on exact match", async () => {
    const { error: promoteError } = await admin.rpc("upsert_owner_flavour_catalogue", {
      p_name: OWNER_PRIORITY_TEST_NAME,
      p_base_token: "matcha-deep",
      p_drizzle_token: "honey-swirl",
      p_crumble_token: "none",
    });
    if (promoteError) throw promoteError;

    const row = await resolveTokens(OWNER_PRIORITY_TEST_NAME);

    expect(row.source).toBe("owner_defined");
    expect(row.flavour_id).toBe(fixtureFlavourId);
    expect(row.base_token).toBe("matcha-deep");
    expect(row.drizzle_token).toBe("honey-swirl");
    expect(row.crumble_token).toBe("none");
  });
});
