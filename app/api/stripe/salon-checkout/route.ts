import { stripe } from "@/src/lib/stripe-server";
import { createClient } from "@/src/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { place_id, tier } = (await req.json()) as {
    place_id: string;
    tier: "basic" | "pro";
  };

  if (!place_id || !["basic", "pro"].includes(tier)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { data: salon } = await supabase
    .from("salon_profiles")
    .select("id, owner_id")
    .eq("place_id", place_id)
    .maybeSingle();

  if (!salon || salon.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const priceId =
    tier === "basic"
      ? process.env.STRIPE_PRICE_ID_SALON_BASIC
      : process.env.STRIPE_PRICE_ID_SALON_PRO;

  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price not configured for salon ${tier}` },
      { status: 500 },
    );
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ["card", "ideal", "bancontact"],
    success_url: `${origin}/salon/${place_id}/dashboard?upgrade=success`,
    cancel_url: `${origin}/salon/${place_id}/dashboard`,
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    metadata: {
      supabase_user_id: user.id,
      salon_id: salon.id,
      salon_tier: tier,
      ...(user.email ? { user_email: user.email } : {}),
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        salon_id: salon.id,
        salon_tier: tier,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "no checkout url" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
