import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase } from "@/src/test-helpers/mockSupabase";
import { sha256Hex, signInWithApple, syncAppleProfile } from "./apple-signin";

const { mockAuthorize } = vi.hoisted(() => ({
  mockAuthorize: vi.fn(),
}));

vi.mock("@capacitor-community/apple-sign-in", () => ({
  SignInWithApple: {
    authorize: mockAuthorize,
  },
}));

describe("sha256Hex", () => {
  it("returns a 64-character lowercase hex-encoded SHA-256 digest", async () => {
    const digest = await sha256Hex("hello");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).toBe(await sha256Hex("hello"));
  });

  it("produces distinct digests for distinct nonces", async () => {
    const a = await sha256Hex("nonce-a");
    const b = await sha256Hex("nonce-b");
    expect(a).not.toBe(b);
  });
});

describe("syncAppleProfile", () => {
  it("creates a profile on first Apple sign-in with display name", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = createMockSupabase({
      profiles: {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert,
      },
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1", email: null } },
    } as never);

    await syncAppleProfile(supabase, { givenName: "Ada", familyName: "Lovelace", email: null });

    expect(insert).toHaveBeenCalledWith({
      id: "user-1",
      username: expect.stringMatching(/^user_[a-z0-9]+$/),
      display_name: "Ada Lovelace",
    });
  });

  it("derives username from email when Apple hides it", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = createMockSupabase({
      profiles: {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert,
      },
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1", email: "ada.lovelace@example.com" } },
    } as never);

    await syncAppleProfile(supabase, { givenName: null, familyName: null, email: null });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "ada_lovelace",
      }),
    );
  });

  it("backfills display_name when Apple sends a name on a later sign-in", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const supabase = createMockSupabase({
      profiles: {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "user-1", display_name: null },
              error: null,
            }),
          }),
        }),
        update,
      },
    });

    await syncAppleProfile(supabase, { givenName: "Ada", familyName: "Lovelace" });

    expect(update).toHaveBeenCalledWith({ display_name: "Ada Lovelace" });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("does nothing when there is no authenticated user", async () => {
    const supabase = createMockSupabase();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as never);

    await syncAppleProfile(supabase, { givenName: "Ada", familyName: "Lovelace" });

    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("signInWithApple", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges the Apple identity token for a Supabase session", async () => {
    mockAuthorize.mockResolvedValue({
      response: {
        identityToken: "apple-id-token",
        givenName: "Ada",
        familyName: "Lovelace",
        email: "ada@privaterelay.appleid.com",
      },
    });

    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = createMockSupabase({
      profiles: {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert,
      },
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-apple", email: "ada@privaterelay.appleid.com" } },
    } as never);

    const result = await signInWithApple(supabase);

    expect(mockAuthorize).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: "name email",
        nonce: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "apple",
      token: "apple-id-token",
      nonce: expect.any(String),
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-apple",
        display_name: "Ada Lovelace",
      }),
    );
    expect(result.profile).toEqual({
      givenName: "Ada",
      familyName: "Lovelace",
      email: "ada@privaterelay.appleid.com",
    });
  });

  it("throws when Apple does not return an identity token", async () => {
    mockAuthorize.mockResolvedValue({ response: {} });
    const supabase = createMockSupabase();

    await expect(signInWithApple(supabase)).rejects.toThrow(
      "Apple did not return an identity token.",
    );
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("surfaces Supabase sign-in errors", async () => {
    mockAuthorize.mockResolvedValue({
      response: { identityToken: "apple-id-token" },
    });
    const supabase = createMockSupabase();
    vi.mocked(supabase.auth.signInWithIdToken).mockResolvedValue({
      error: new Error("invalid token"),
    } as never);

    await expect(signInWithApple(supabase)).rejects.toThrow("invalid token");
  });
});
