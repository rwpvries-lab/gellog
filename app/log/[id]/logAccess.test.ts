import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLogAccess } from "./logAccess";

type LogRow = {
  id: string;
  user_id: string;
  visibility: "public" | "friends" | "private";
  [key: string]: unknown;
};

function baseLogRow(overrides: Partial<LogRow> = {}): LogRow {
  return {
    id: "log-1",
    user_id: "author-1",
    salon_name: "Gelato Palace",
    salon_lat: null,
    salon_lng: null,
    salon_place_id: null,
    overall_rating: 4,
    notes: null,
    photo_url: null,
    visited_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    vessel: null,
    price_cents: null,
    weather_temp_c: null,
    weather_condition: null,
    weather_uv_index: null,
    photo_visibility: "public",
    hide_price: false,
    profiles: { id: "author-1", username: "author", avatar_url: null },
    log_flavours: [],
    visibility: "public",
    ...overrides,
  };
}

function buildMockSupabase(options: {
  logRow: LogRow | null;
  logError?: unknown;
  friendshipRow?: { following_id: string } | null;
}) {
  const single = vi.fn().mockResolvedValue({ data: options.logRow, error: options.logError ?? null });
  const eqId = vi.fn().mockReturnValue({ single });
  const logsSelect = vi.fn().mockReturnValue({ eq: eqId });

  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: options.friendshipRow ?? null, error: null });
  const eqFollowingId = vi.fn().mockReturnValue({ maybeSingle });
  const eqFollowerId = vi.fn().mockReturnValue({ eq: eqFollowingId });
  const friendshipsSelect = vi.fn().mockReturnValue({ eq: eqFollowerId });

  const from = vi.fn((table: string) => {
    if (table === "ice_cream_logs") return { select: logsSelect };
    if (table === "friendships") return { select: friendshipsSelect };
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    supabase: { from } as unknown as SupabaseClient,
    friendshipsSelect,
    eqFollowerId,
    eqFollowingId,
  };
}

describe("resolveLogAccess", () => {
  it("returns the log for a public visibility log to an anonymous viewer", async () => {
    const { supabase } = buildMockSupabase({ logRow: baseLogRow({ visibility: "public" }) });
    const result = await resolveLogAccess(supabase, "log-1", null);
    expect(result.status).toBe("ok");
  });

  it("returns not_found when the log row is missing", async () => {
    const { supabase } = buildMockSupabase({ logRow: null });
    const result = await resolveLogAccess(supabase, "missing", null);
    expect(result.status).toBe("not_found");
  });

  it("returns not_found when the select errors", async () => {
    const { supabase } = buildMockSupabase({ logRow: null, logError: new Error("boom") });
    const result = await resolveLogAccess(supabase, "log-1", null);
    expect(result.status).toBe("not_found");
  });

  describe("private visibility", () => {
    it("rejects an anonymous viewer", async () => {
      const { supabase } = buildMockSupabase({ logRow: baseLogRow({ visibility: "private" }) });
      const result = await resolveLogAccess(supabase, "log-1", null);
      expect(result.status).toBe("not_found");
    });

    it("rejects a viewer who isn't the author", async () => {
      const { supabase } = buildMockSupabase({ logRow: baseLogRow({ visibility: "private" }) });
      const result = await resolveLogAccess(supabase, "log-1", { id: "someone-else" });
      expect(result.status).toBe("not_found");
    });

    it("allows the author", async () => {
      const { supabase } = buildMockSupabase({ logRow: baseLogRow({ visibility: "private" }) });
      const result = await resolveLogAccess(supabase, "log-1", { id: "author-1" });
      expect(result.status).toBe("ok");
    });
  });

  describe("friends visibility", () => {
    it("rejects an anonymous viewer without querying friendships", async () => {
      const { supabase, friendshipsSelect } = buildMockSupabase({
        logRow: baseLogRow({ visibility: "friends" }),
      });
      const result = await resolveLogAccess(supabase, "log-1", null);
      expect(result.status).toBe("not_found");
      expect(friendshipsSelect).not.toHaveBeenCalled();
    });

    it("allows the author without querying friendships", async () => {
      const { supabase, friendshipsSelect } = buildMockSupabase({
        logRow: baseLogRow({ visibility: "friends" }),
      });
      const result = await resolveLogAccess(supabase, "log-1", { id: "author-1" });
      expect(result.status).toBe("ok");
      expect(friendshipsSelect).not.toHaveBeenCalled();
    });

    it("allows a viewer who follows the author", async () => {
      const { supabase } = buildMockSupabase({
        logRow: baseLogRow({ visibility: "friends" }),
        friendshipRow: { following_id: "author-1" },
      });
      const result = await resolveLogAccess(supabase, "log-1", { id: "friend-1" });
      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.friendshipWithAuthor).toEqual({ following_id: "author-1" });
      }
    });

    it("rejects a viewer who does not follow the author", async () => {
      const { supabase } = buildMockSupabase({
        logRow: baseLogRow({ visibility: "friends" }),
        friendshipRow: null,
      });
      const result = await resolveLogAccess(supabase, "log-1", { id: "stranger-1" });
      expect(result.status).toBe("not_found");
    });
  });
});
