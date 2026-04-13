import { createClient } from 'jsr:@supabase/supabase-js@2';

import { applyProfileBillingUpdate } from '../_shared/billing-profile.ts';
import { deriveRevenueCatProfileUpdate, fetchRevenueCatSubscriber } from '../_shared/revenuecat.ts';

type RevenueCatWebhookPayload = {
  app_user_id?: string | null;
  event?: {
    app_user_id?: string | null;
    type?: string | null;
  } | null;
};

function getAppUserId(payload: RevenueCatWebhookPayload) {
  if (typeof payload.app_user_id === 'string' && payload.app_user_id.length > 0) {
    return payload.app_user_id;
  }

  if (typeof payload.event?.app_user_id === 'string' && payload.event.app_user_id.length > 0) {
    return payload.event.app_user_id;
  }

  return null;
}

function getEventType(payload: RevenueCatWebhookPayload) {
  if (typeof payload.event?.type === 'string' && payload.event.type.length > 0) {
    return payload.event.type;
  }

  return null;
}

function hasValidAuthorization(req: Request) {
  const expectedHeader = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_HEADER');

  if (!expectedHeader) {
    return true;
  }

  return req.headers.get('authorization') === expectedHeader;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const entitlementId = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ?? 'pro';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!hasValidAuthorization(req)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as RevenueCatWebhookPayload;
    const eventType = getEventType(payload);

    if (eventType === 'TEST') {
      return new Response(JSON.stringify({ received: true, test: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const appUserId = getAppUserId(payload);

    if (!appUserId) {
      throw new Error('Webhook payload did not include an app_user_id');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const subscriber = await fetchRevenueCatSubscriber(appUserId);
    const profileUpdate = deriveRevenueCatProfileUpdate(subscriber, appUserId, entitlementId);

    await applyProfileBillingUpdate(supabaseAdmin, appUserId, profileUpdate);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
