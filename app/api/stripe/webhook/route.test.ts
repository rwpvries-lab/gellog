import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { mockConstructEvent, mockRetrieve, mockCreateAdminClient } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockRetrieve: vi.fn(),
  mockCreateAdminClient: vi.fn(),
}));

vi.mock("@/src/lib/stripe-server", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockRetrieve },
  },
}));

vi.mock("@/src/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

describe("stripe webhook POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockRetrieve.mockResolvedValue({
      items: { data: [{ current_period_end: 1_700_000_000 }] },
    });
  });

  it("returns 500 when webhook secret is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const response = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(500);
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(400);
  });

  it("updates salon_profiles on salon checkout completion", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          metadata: { salon_id: "salon-1", salon_tier: "pro" },
          customer: "cus_salon",
          subscription: "sub_salon",
        },
      },
    });

    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ update }) });

    const response = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        salon_subscription_tier: "pro",
        salon_stripe_customer_id: "cus_salon",
      }),
    );
    expect(eq).toHaveBeenCalledWith("id", "salon-1");
  });

  it("updates profiles on user checkout completion", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          metadata: { supabase_user_id: "user-1" },
          customer: "cus_user",
          subscription: "sub_user",
        },
      },
    });

    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ update }) });

    const response = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_tier: "premium",
        stripe_customer_id: "cus_user",
      }),
    );
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("downgrades salon subscription on customer.subscription.deleted", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { salon_id: "salon-9" },
          customer: "cus_salon",
        },
      },
    });

    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ update }) });

    const response = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      salon_subscription_tier: "free",
      salon_subscription_expires_at: null,
    });
  });
});
