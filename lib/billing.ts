import { Platform } from 'react-native';

export type BillingProvider = 'stripe' | 'revenuecat';
export type BillingStore =
  | 'web'
  | 'stripe'
  | 'app_store'
  | 'play_store'
  | 'amazon'
  | 'mac_app_store'
  | 'rc_billing'
  | 'test_store'
  | 'external'
  | 'unknown';

export type BillingProfile = {
  is_pro?: boolean | null;
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
  canceled_at?: string | null;
  subscription_status?: string | null;
  billing_provider?: BillingProvider | null;
  billing_product_id?: string | null;
  billing_entitlement_id?: string | null;
  billing_store?: BillingStore | null;
  billing_last_synced_at?: string | null;
  revenuecat_app_user_id?: string | null;
};

type PendingBillingRedirect = {
  source: 'checkout' | 'portal';
  startedAt: number;
};

export const BILLING_RETURN_SYNC_WINDOW_MS = 15_000;
export const BILLING_RETURN_SYNC_RETRY_MS = 1_500;

const BILLING_RETURN_STORAGE_KEY = 'billing-return-expected';

export function hasActiveProAccess(profile: BillingProfile | null | undefined, nowMs = Date.now()) {
  if (!profile) return false;

  if (Boolean(profile.is_pro)) {
    return true;
  }

  if (!profile.current_period_end) {
    return false;
  }

  const periodEndMs = Date.parse(profile.current_period_end);
  if (!Number.isFinite(periodEndMs)) {
    return false;
  }

  return periodEndMs > nowMs;
}

export function markBillingReturnPending(source: PendingBillingRedirect['source']) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const payload: PendingBillingRedirect = {
    source,
    startedAt: Date.now(),
  };

  window.sessionStorage.setItem(BILLING_RETURN_STORAGE_KEY, JSON.stringify(payload));
}

export function getPendingBillingReturn() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(BILLING_RETURN_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PendingBillingRedirect>;
    const source = parsed.source;
    const startedAt = parsed.startedAt;

    if ((source !== 'checkout' && source !== 'portal') || typeof startedAt !== 'number') {
      clearPendingBillingReturn();
      return null;
    }

    if (Date.now() - startedAt > BILLING_RETURN_SYNC_WINDOW_MS) {
      clearPendingBillingReturn();
      return null;
    }

    return {
      source,
      startedAt,
    } satisfies PendingBillingRedirect;
  } catch {
    clearPendingBillingReturn();
    return null;
  }
}

export function clearPendingBillingReturn() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(BILLING_RETURN_STORAGE_KEY);
}

export function formatBillingProvider(provider: BillingProvider | string | null | undefined) {
  if (provider === 'stripe') {
    return 'Stripe';
  }

  if (provider === 'revenuecat') {
    return 'RevenueCat';
  }

  return 'Unknown';
}

export function formatBillingStore(store: BillingStore | string | null | undefined) {
  switch (store) {
    case 'web':
      return 'Web';
    case 'stripe':
      return 'Stripe';
    case 'app_store':
      return 'App Store';
    case 'play_store':
      return 'Google Play';
    case 'amazon':
      return 'Amazon Appstore';
    case 'mac_app_store':
      return 'Mac App Store';
    case 'rc_billing':
      return 'RevenueCat Web Billing';
    case 'test_store':
      return 'Test Store';
    case 'external':
      return 'External';
    default:
      return 'Unknown';
  }
}
