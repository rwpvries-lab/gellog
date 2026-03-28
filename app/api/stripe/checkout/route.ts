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

  const priceId = process.env.STRIPE_PRICE_ID_ICECREAM_PLUS;
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price is not configured (STRIPE_PRICE_ID_ICECREAM_PLUS)" },
      { status: 500 },
    );
  }

  const origin = new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ["card", "ideal", "bancontact"],
    success_url: `${origin}/settings?upgrade=success`,
    cancel_url: `${origin}/settings`,
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    metadata: {
      supabase_user_id: user.id,
      ...(user.email ? { user_email: user.email } : {}),
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "no checkout url" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
