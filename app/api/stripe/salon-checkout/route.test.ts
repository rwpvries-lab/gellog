import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { mockCreateClient, mockCheckoutCreate } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCheckoutCreate: vi.fn(),
}));

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/src/lib/stripe-server", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mockCheckoutCreate,
      },
    },
  },
}));

function mockAuthedClient(options?: {
  salon?: { id: string; owner_id: string } | null;
  userId?: string;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: options?.salon ?? null });
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: options?.userId ?? "owner-1",
            email: "owner@gellog.app",
          },
        },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    }),
  });
}

describe("stripe salon checkout POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRICE_ID_SALON_BASIC = "price_salon_basic";
    process.env.STRIPE_PRICE_ID_SALON_PRO = "price_salon_pro";
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/salon-session" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await POST(
      new NextRequest("https://gellog.app/api/stripe/salon-checkout", {
        method: "POST",
        body: JSON.stringify({ place_id: "ChIJ123", tier: "pro" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid tier or place_id", async () => {
    mockAuthedClient();

    const response = await POST(
      new NextRequest("https://gellog.app/api/stripe/salon-checkout", {
        method: "POST",
        body: JSON.stringify({ place_id: "", tier: "enterprise" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 403 when the user does not own the salon", async () => {
    mockAuthedClient({
      salon: { id: "salon-1", owner_id: "someone-else" },
      userId: "owner-1",
    });

    const response = await POST(
      new NextRequest("https://gellog.app/api/stripe/salon-checkout", {
        method: "POST",
        body: JSON.stringify({ place_id: "ChIJ123", tier: "basic" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("creates a pro checkout session for the salon owner", async () => {
    mockAuthedClient({
      salon: { id: "salon-1", owner_id: "owner-1" },
      userId: "owner-1",
    });

    const response = await POST(
      new NextRequest("https://gellog.app/api/stripe/salon-checkout", {
        method: "POST",
        headers: {
          host: "gellog.app",
          "x-forwarded-proto": "https",
        },
        body: JSON.stringify({ place_id: "ChIJ123", tier: "pro" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/salon-session" });
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_salon_pro", quantity: 1 }],
        success_url: "https://gellog.app/salon/ChIJ123/dashboard?upgrade=success",
        cancel_url: "https://gellog.app/salon/ChIJ123/dashboard",
        metadata: expect.objectContaining({
          salon_id: "salon-1",
          salon_tier: "pro",
        }),
      }),
    );
  });
});
