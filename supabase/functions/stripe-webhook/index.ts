import Stripe from 'npm:stripe@18.4.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { applyProfileBillingUpdate } from '../_shared/billing-profile.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-06-30.basil',
});

function toIsoString(unixSeconds: number | null) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  if (typeof subscription.cancel_at === 'number') {
    return subscription.cancel_at;
  }

  const itemPeriodEnds = subscription.items.data
    .map((item) => (typeof item.current_period_end === 'number' ? item.current_period_end : null))
    .filter((value): value is number => value !== null);

  if (itemPeriodEnds.length === 0) {
    return null;
  }

  // Stripe removed top-level subscription.current_period_end in Basil.
  // For this app's single-price subscription, the item period end is the right source of truth.
  return Math.min(...itemPeriodEnds);
}

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('Stripe-Signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!signature) throw new Error('Missing Stripe-Signature header');
    if (!webhookSecret || !supabaseUrl || !serviceRoleKey) throw new Error('Missing env vars');

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const upsertFromSubscription = async (subscription: Stripe.Subscription, userId?: string | null) => {
      const periodEndUnix = getSubscriptionPeriodEnd(subscription);
      const currentPeriodEnd = toIsoString(periodEndUnix);
      const canceledAt = toIsoString(
        typeof subscription.canceled_at === 'number' ? subscription.canceled_at : null
      );
      const hasFutureAccessWindow = typeof periodEndUnix === 'number' && periodEndUnix * 1000 > Date.now();

      const isEntitled =
        subscription.status === 'active' ||
        subscription.status === 'trialing' ||
        hasFutureAccessWindow;

      const payload = {
        is_pro: isEntitled,
        stripe_customer_id: String(subscription.customer),
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: currentPeriodEnd,
        canceled_at: canceledAt,
        billing_provider: 'stripe' as const,
        billing_product_id: subscription.items.data[0]?.price?.id ?? null,
        billing_entitlement_id: 'pro',
        billing_store: 'web',
        billing_last_synced_at: new Date().toISOString(),
      };

      let targetUserId = userId ?? null;

      if (!targetUserId) {
        const { data: bySub } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();
        targetUserId = bySub?.id ?? null;
      }

      if (!targetUserId) {
        const { data: byCustomer } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', String(subscription.customer))
          .maybeSingle();
        targetUserId = byCustomer?.id ?? null;
      }

      if (!targetUserId) {
        console.log('stripe-webhook: no matching profile', {
          subscriptionId: subscription.id,
          customerId: String(subscription.customer),
          status: subscription.status,
        });
        return;
      }

      console.log('stripe-webhook: syncing profile', {
        userId: targetUserId,
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd,
        canceledAt,
        isEntitled,
      });

      await applyProfileBillingUpdate(supabaseAdmin, targetUserId, payload);
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ?? session.client_reference_id ?? null;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!userId) break;

        if (session.customer) {
          await supabaseAdmin
            .from('profiles')
            .upsert(
              {
                id: userId,
                stripe_customer_id: String(session.customer),
                subscription_status: 'active',
              },
              { onConflict: 'id' }
            );
        }

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(subscription, userId);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;

        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertFromSubscription(subscription);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(subscription);
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('stripe-webhook error', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
