import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { useAppState } from '@/contexts/AppStateContext';
import { markBillingReturnPending, type BillingProvider as BillingProviderName } from '@/lib/billing';
import { hasNativeBillingConfig } from '@/lib/billingConfig';
import {
  clearRevenueCatUser,
  fetchRevenueCatState,
  getRevenueCatEntitlementSummary,
  isNativeRevenueCatEnabled,
  isRevenueCatUserCancelled,
  openRevenueCatSubscriptionManagement,
  purchaseRevenueCatPro,
  restoreRevenueCatPurchases,
  syncRevenueCatProfile,
  type RevenueCatEntitlementSummary,
  type RevenueCatPackageSummary,
} from '@/lib/revenueCat';
import { supabase } from '@/lib/supabase';

type BillingActionResult = {
  status: 'completed' | 'cancelled';
};

type BillingContextValue = {
  billingProvider: BillingProviderName | 'none';
  billingConfigured: boolean;
  loadingBillingState: boolean;
  billingBusy: boolean;
  currentPackage: RevenueCatPackageSummary | null;
  nativeEntitlement: RevenueCatEntitlementSummary | null;
  canPurchase: boolean;
  canManageSubscription: boolean;
  canRestorePurchases: boolean;
  purchasePro: () => Promise<BillingActionResult>;
  manageSubscription: () => Promise<void>;
  restorePurchases: () => Promise<BillingActionResult>;
  refreshBillingState: (options?: { syncProfile?: boolean }) => Promise<void>;
};

const BillingContext = createContext<BillingContextValue | undefined>(undefined);

function getBillingProvider() {
  if (Platform.OS === 'web') {
    return 'stripe' as const;
  }

  if (hasNativeBillingConfig()) {
    return 'revenuecat' as const;
  }

  return 'none' as const;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown billing error.';
}

async function startStripeCheckout() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {},
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.url) {
    throw new Error('No checkout URL was returned.');
  }

  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('Stripe checkout is only available on web in this build.');
  }

  markBillingReturnPending('checkout');
  window.location.href = data.url;
}

async function openStripePortal() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
    body: {},
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.url) {
    throw new Error('No portal URL was returned.');
  }

  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('Stripe customer portal is only available on web in this build.');
  }

  markBillingReturnPending('portal');
  window.location.href = data.url;
}

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const {
    isSignedIn,
    refreshAppState,
    userId,
  } = useAppState();

  const [loadingBillingState, setLoadingBillingState] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<RevenueCatPackageSummary | null>(null);
  const [nativeEntitlement, setNativeEntitlement] = useState<RevenueCatEntitlementSummary | null>(null);

  const billingProvider = getBillingProvider();
  const billingConfigured =
    billingProvider === 'stripe' ? true : billingProvider === 'revenuecat' ? isNativeRevenueCatEnabled() : false;

  const refreshBillingState = useCallback(async (options?: { syncProfile?: boolean }) => {
    if (billingProvider !== 'revenuecat' || !userId || !isSignedIn) {
      setCurrentPackage(null);
      setNativeEntitlement(null);
      setLoadingBillingState(false);
      return;
    }

    try {
      setLoadingBillingState(true);

      const nextState = await fetchRevenueCatState(userId);

      setCurrentPackage(nextState.currentPackage);
      setNativeEntitlement(nextState.entitlement);

      if (options?.syncProfile !== false) {
        await syncRevenueCatProfile();
        await refreshAppState({ silent: true });
      }
    } finally {
      setLoadingBillingState(false);
    }
  }, [billingProvider, isSignedIn, refreshAppState, userId]);

  useEffect(() => {
    if (billingProvider === 'revenuecat' && userId && isSignedIn) {
      void refreshBillingState();
      return;
    }

    if (billingProvider === 'revenuecat' && !userId) {
      void clearRevenueCatUser();
    }

    setCurrentPackage(null);
    setNativeEntitlement(null);
    setLoadingBillingState(false);
  }, [billingProvider, isSignedIn, refreshBillingState, userId]);

  useEffect(() => {
    if (billingProvider !== 'revenuecat' || !userId || !isSignedIn) {
      return;
    }

    const listener = (customerInfo: CustomerInfo) => {
      setNativeEntitlement(getRevenueCatEntitlementSummary(customerInfo));

      void syncRevenueCatProfile()
        .then(() => refreshAppState({ silent: true }))
        .catch(() => {
          // Keep listener failures silent; the pricing screen can retry a manual sync.
        });
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [billingProvider, isSignedIn, refreshAppState, userId]);

  useEffect(() => {
    if (billingProvider !== 'revenuecat' || !userId || !isSignedIn) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshBillingState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [billingProvider, isSignedIn, refreshBillingState, userId]);

  const purchasePro = useCallback(async () => {
    if (!userId || !isSignedIn) {
      throw new Error('Sign in before managing subscriptions.');
    }

    try {
      setBillingBusy(true);

      if (billingProvider === 'stripe') {
        await startStripeCheckout();
        return { status: 'completed' } satisfies BillingActionResult;
      }

      if (billingProvider !== 'revenuecat') {
        throw new Error('Billing is not configured for this build.');
      }

      try {
        const purchaseResult = await purchaseRevenueCatPro(userId);
        setCurrentPackage((current) => current ?? purchaseResult.currentPackage);
        setNativeEntitlement(purchaseResult.entitlement);
      } catch (error) {
        if (isRevenueCatUserCancelled(error)) {
          return { status: 'cancelled' } satisfies BillingActionResult;
        }

        throw error;
      }

      await syncRevenueCatProfile();
      await refreshAppState();
      await refreshBillingState({ syncProfile: false });

      return { status: 'completed' } satisfies BillingActionResult;
    } finally {
      setBillingBusy(false);
    }
  }, [billingProvider, isSignedIn, refreshAppState, refreshBillingState, userId]);

  const manageSubscription = useCallback(async () => {
    if (!userId || !isSignedIn) {
      throw new Error('Sign in before managing subscriptions.');
    }

    try {
      setBillingBusy(true);

      if (billingProvider === 'stripe') {
        await openStripePortal();
        return;
      }

      if (billingProvider !== 'revenuecat') {
        throw new Error('Billing is not configured for this build.');
      }

      await openRevenueCatSubscriptionManagement();
    } finally {
      setBillingBusy(false);
    }
  }, [billingProvider, isSignedIn, userId]);

  const restorePurchases = useCallback(async () => {
    if (billingProvider !== 'revenuecat') {
      throw new Error('Restore purchases is only available on native store builds.');
    }

    if (!userId || !isSignedIn) {
      throw new Error('Sign in before restoring purchases.');
    }

    try {
      setBillingBusy(true);

      const restoreResult = await restoreRevenueCatPurchases(userId);
      setNativeEntitlement(restoreResult.entitlement);

      await syncRevenueCatProfile();
      await refreshAppState();
      await refreshBillingState({ syncProfile: false });

      return { status: 'completed' } satisfies BillingActionResult;
    } catch (error) {
      if (isRevenueCatUserCancelled(error)) {
        return { status: 'cancelled' } satisfies BillingActionResult;
      }

      throw new Error(getErrorMessage(error));
    } finally {
      setBillingBusy(false);
    }
  }, [billingProvider, isSignedIn, refreshAppState, refreshBillingState, userId]);

  const value = useMemo(() => ({
    billingProvider,
    billingConfigured,
    loadingBillingState,
    billingBusy,
    currentPackage,
    nativeEntitlement,
    canPurchase:
      billingProvider === 'stripe'
        ? Boolean(isSignedIn)
        : billingProvider === 'revenuecat'
          ? Boolean(isSignedIn && billingConfigured && currentPackage)
          : false,
    canManageSubscription:
      billingProvider === 'stripe'
        ? Boolean(isSignedIn)
        : billingProvider === 'revenuecat'
          ? Boolean(isSignedIn && billingConfigured)
          : false,
    canRestorePurchases: billingProvider === 'revenuecat' && Boolean(isSignedIn && billingConfigured),
    purchasePro,
    manageSubscription,
    restorePurchases,
    refreshBillingState,
  }), [
    billingBusy,
    billingConfigured,
    billingProvider,
    currentPackage,
    isSignedIn,
    loadingBillingState,
    manageSubscription,
    nativeEntitlement,
    purchasePro,
    refreshBillingState,
    restorePurchases,
  ]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const context = useContext(BillingContext);

  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }

  return context;
}
