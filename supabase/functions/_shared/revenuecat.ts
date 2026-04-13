const REVENUECAT_API_BASE_URL = 'https://api.revenuecat.com/v1';

type RevenueCatEntitlement = {
  product_identifier?: string | null;
  expires_date?: string | null;
  purchase_date?: string | null;
  unsubscribe_detected_at?: string | null;
  store?: string | null;
};

type RevenueCatSubscription = {
  expires_date?: string | null;
  unsubscribe_detected_at?: string | null;
  store?: string | null;
};

type RevenueCatSubscriber = {
  original_app_user_id?: string | null;
  entitlements?: Record<string, RevenueCatEntitlement | undefined>;
  subscriptions?: Record<string, RevenueCatSubscription | undefined>;
};

type RevenueCatSubscriberResponse = {
  subscriber?: RevenueCatSubscriber;
};

function normalizeRevenueCatStore(store: string | null | undefined) {
  switch (store) {
    case 'APP_STORE':
      return 'app_store';
    case 'PLAY_STORE':
      return 'play_store';
    case 'STRIPE':
      return 'stripe';
    case 'AMAZON':
      return 'amazon';
    case 'MAC_APP_STORE':
      return 'mac_app_store';
    case 'RC_BILLING':
      return 'rc_billing';
    case 'TEST_STORE':
      return 'test_store';
    case 'EXTERNAL':
      return 'external';
    default:
      return 'unknown';
  }
}

function getLatestSubscriptionForProduct(
  subscriptions: Record<string, RevenueCatSubscription | undefined> | undefined,
  productIdentifier: string | null | undefined
) {
  if (!subscriptions || !productIdentifier) {
    return null;
  }

  return subscriptions[productIdentifier] ?? null;
}

function hasFutureDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const nextDateMs = Date.parse(value);
  return Number.isFinite(nextDateMs) && nextDateMs > Date.now();
}

export async function fetchRevenueCatSubscriber(appUserId: string) {
  const apiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');

  if (!apiKey) {
    throw new Error('Missing REVENUECAT_SECRET_API_KEY');
  }

  const response = await fetch(
    `${REVENUECAT_API_BASE_URL}/subscribers/${encodeURIComponent(appUserId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`RevenueCat subscriber lookup failed with status ${response.status}`);
  }

  const parsed = (await response.json()) as RevenueCatSubscriberResponse;
  const subscriber = parsed.subscriber;

  if (!subscriber) {
    throw new Error('RevenueCat returned an empty subscriber payload');
  }

  return subscriber;
}

export function deriveRevenueCatProfileUpdate(
  subscriber: RevenueCatSubscriber,
  appUserId: string,
  entitlementId: string
) {
  const entitlement = subscriber.entitlements?.[entitlementId] ?? null;
  const subscription = getLatestSubscriptionForProduct(
    subscriber.subscriptions,
    entitlement?.product_identifier ?? null
  );

  const currentPeriodEnd = entitlement?.expires_date ?? subscription?.expires_date ?? null;
  const canceledAt =
    entitlement?.unsubscribe_detected_at ?? subscription?.unsubscribe_detected_at ?? null;
  const isEntitled = hasFutureDate(currentPeriodEnd);

  return {
    is_pro: isEntitled,
    cancel_at_period_end: Boolean(canceledAt && currentPeriodEnd && hasFutureDate(currentPeriodEnd)),
    current_period_end: currentPeriodEnd,
    canceled_at: canceledAt,
    subscription_status: isEntitled ? 'active' : canceledAt ? 'canceled' : 'inactive',
    billing_provider: 'revenuecat' as const,
    billing_product_id: entitlement?.product_identifier ?? null,
    billing_entitlement_id: entitlementId,
    billing_store: normalizeRevenueCatStore(entitlement?.store ?? subscription?.store ?? null),
    billing_last_synced_at: new Date().toISOString(),
    revenuecat_app_user_id: subscriber.original_app_user_id ?? appUserId,
  };
}
