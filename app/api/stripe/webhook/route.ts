import { stripe } from "@/src/lib/stripe-server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verify failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId =
          session.metadata?.supabase_user_id ?? session.client_reference_id;
        if (!userId) {
          console.error("[stripe/webhook] checkout.session.completed: no user id");
          break;
        }

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (!customerId) {
          console.error("[stripe/webhook] checkout.session.completed: no customer");
          break;
        }

        let expiresAt: string | null = null;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const periodEnd = sub.items.data[0]?.current_period_end;
          if (periodEnd) {
            expiresAt = new Date(periodEnd * 1000).toISOString();
          }
        }

        const { error } = await admin.from("profiles").update({
          subscription_tier: "premium",
          stripe_customer_id: customerId,
          subscription_expires_at: expiresAt,
        }).eq("id", userId);

        if (error) {
          console.error("[stripe/webhook] profiles update failed:", error);
          return NextResponse.json({ error: "database error" }, { status: 500 });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const baseUpdate = admin.from("profiles").update({
          subscription_tier: "free",
          subscription_expires_at: null,
        });
        const { error } = userId
          ? await baseUpdate.eq("id", userId)
          : await baseUpdate.eq("stripe_customer_id", customerId);
        if (error) {
          console.error("[stripe/webhook] subscription deleted update failed:", error);
          return NextResponse.json({ error: "database error" }, { status: 500 });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe/webhook]", e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
