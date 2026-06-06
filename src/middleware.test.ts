import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateServerClient, mockGetClaims } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(),
  mockGetClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

import { middleware } from "./middleware";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    mockGetClaims.mockResolvedValue({});
    mockCreateServerClient.mockReturnValue({
      auth: { getClaims: mockGetClaims },
    });
  });

  it("refreshes the session via getClaims and returns next()", async () => {
    const request = new NextRequest("http://localhost/feed");
    const response = await middleware(request);

    expect(mockCreateServerClient).toHaveBeenCalled();
    expect(mockGetClaims).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("still returns next() when getClaims throws", async () => {
    mockGetClaims.mockRejectedValue(new Error("stale refresh token"));

    const response = await middleware(new NextRequest("http://localhost/feed"));
    expect(response.status).toBe(200);
  });
});
