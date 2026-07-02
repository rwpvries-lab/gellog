import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase } from "@/src/test-helpers/mockSupabase";
import {
  GoogleSignInCancelled,
  signInWithGoogle,
  syncGoogleProfile,
} from "./google-signin";

const { mockInitialize, mockLogin } = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
  mockLogin: vi.fn(),
}));

vi.mock("@capgo/capacitor-social-login", () => ({
  SocialLogin: {
    initialize: mockInitialize,
    login: mockLogin,
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(true),
    getPlatform: vi.fn().mockReturnValue("android"),
  },
}));

describe("syncGoogleProfile", () => {
  it("creates a profile on first Google sign-in with display name", async () => {
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
      data: { user: { id: "user-1", email: "ada@gmail.com" } },
    } as never);

    await syncGoogleProfile(supabase, { name: "Ada Lovelace", email: "ada@gmail.com" });

    expect(insert).toHaveBeenCalledWith({
      id: "user-1",
      username: "ada",
      display_name: "Ada Lovelace",
    });
  });

  it("derives username from email when no display name is provided", async () => {
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

    await syncGoogleProfile(supabase, {});

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "ada_lovelace",
        display_name: null,
      }),
    );
  });
});

describe("signInWithGoogle", () => {
  beforeEach(() => {
    mockInitialize.mockReset();
    mockLogin.mockReset();
    mockInitialize.mockResolvedValue(undefined);
  });

  it("does not pass custom scopes to the native plugin", async () => {
    mockLogin.mockResolvedValue({
      result: {
        responseType: "online",
        idToken: "google-id-token",
        profile: {
          email: "test@gmail.com",
          name: "Test User",
        },
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

    await signInWithGoogle(supabase);

    expect(mockLogin).toHaveBeenCalledWith({ provider: "google", options: {} });
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "google-id-token",
    });
    expect(insert).toHaveBeenCalled();
  });

  it("throws GoogleSignInCancelled when the user dismisses the sheet", async () => {
    mockLogin.mockRejectedValue({ code: "USER_CANCELLED" });
    const supabase = createMockSupabase();

    await expect(signInWithGoogle(supabase)).rejects.toBeInstanceOf(
      GoogleSignInCancelled,
    );
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("surfaces Supabase token exchange failures", async () => {
    mockLogin.mockResolvedValue({
      result: {
        responseType: "online",
        idToken: "google-id-token",
        profile: { email: "test@gmail.com", name: "Test User" },
      },
    });

    const supabase = createMockSupabase();
    vi.mocked(supabase.auth.signInWithIdToken).mockResolvedValue({
      error: { message: "Invalid token" },
    } as never);

    await expect(signInWithGoogle(supabase)).rejects.toMatchObject({
      message: "Invalid token",
    });
  });
});
