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

describe("stripe user checkout POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRICE_ID_ICECREAM_PLUS = "price_icecream_plus";
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/user-session" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await POST(
      new NextRequest("https://gellog.app/api/stripe/checkout", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when the Ice Cream+ price is not configured", async () => {
    delete process.env.STRIPE_PRICE_ID_ICECREAM_PLUS;
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "fan@gellog.app" } },
        }),
      },
    });

    const response = await POST(
      new NextRequest("https://gellog.app/api/stripe/checkout", { method: "POST" }),
    );

    expect(response.status).toBe(500);
  });

  it("creates a subscription checkout session for the signed-in user", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "fan@gellog.app" } },
        }),
      },
    });

    const response = await POST(
      new NextRequest("https://gellog.app/api/stripe/checkout", {
        method: "POST",
        headers: {
          host: "gellog.app",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/user-session" });
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_icecream_plus", quantity: 1 }],
        success_url: "https://gellog.app/settings?upgrade=success",
        cancel_url: "https://gellog.app/settings",
        client_reference_id: "user-1",
        customer_email: "fan@gellog.app",
        metadata: expect.objectContaining({ supabase_user_id: "user-1" }),
      }),
    );
  });
});
