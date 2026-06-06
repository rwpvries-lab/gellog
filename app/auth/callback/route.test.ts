import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

describe("auth callback GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to next after creating a missing OAuth profile", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-42", email: "new.user@example.com" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
        insert,
      }),
    });

    const response = await GET(
      new Request("https://gellog.app/auth/callback?code=abc123&next=/feed"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://gellog.app/feed");
    expect(insert).toHaveBeenCalledWith({
      id: "user-42",
      username: "new_user",
    });
  });

  it("redirects to login when code exchange fails", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("bad code") }),
      },
    });

    const response = await GET(new Request("https://gellog.app/auth/callback?code=bad"));

    expect(response.headers.get("location")).toBe("https://gellog.app/login?error=auth_callback_error");
  });
});
