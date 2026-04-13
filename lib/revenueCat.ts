import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { getProEntitlementId, getRevenueCatApiKeyForPlatform, hasNativeBillingConfig } from '@/lib/billingConfig';
import { supabase } from '@/lib/supabase';

export type RevenueCatPackageSummary = {
  identifier: string;
  packageType: string;
  productIdentifier: string;
  title: string;
  priceString: string;
  offeringIdentifier: string | null;
};

export type RevenueCatEntitlementSummary = {
  identifier: string;
  isActive: boolean;
  productIdentifier: string | null;
  expirationDate: string | null;
  latestExpirationDate: string | null;
  managementUrl: string | null;
  store: string | null;
  originalAppUserId: string;
};

let configuredAppUserId: string | null = null;

function isNativeRevenueCatPlatform(platform = Platform.OS) {
  return platform === 'ios' || platform === 'android';
}

function getRevenueCatPackageSummary(aPackage: PurchasesPackage | null | undefined) {
  if (!aPackage) {
    return null;
  }

  return {
    identifier: aPackage.identifier,
    packageType: aPackage.packageType,
    productIdentifier: aPackage.product.identifier,
    title: aPackage.product.title,
    priceString: aPackage.product.priceString,
    offeringIdentifier: aPackage.offeringIdentifier ?? null,
  } satisfies RevenueCatPackageSummary;
}

function getPrimaryRevenueCatPackage(availablePackages: PurchasesPackage[]) {
  return availablePackages.find((aPackage) => aPackage.packageType === 'MONTHLY') ?? availablePackages[0] ?? null;
}

export function getRevenueCatEntitlementSummary(customerInfo: CustomerInfo | null | undefined) {
  if (!customerInfo) {
    return null;
  }

  const entitlementId = getProEntitlementId();
  const entitlement =
    customerInfo.entitlements.active[entitlementId] ??
    customerInfo.entitlements.all[entitlementId] ??
    null;

  if (!entitlement) {
    return null;
  }

  return {
    identifier: entitlement.identifier,
    isActive: entitlement.isActive,
    productIdentifier: entitlement.productIdentifier ?? null,
    expirationDate: entitlement.expirationDate ?? null,
    latestExpirationDate: customerInfo.latestExpirationDate ?? null,
    managementUrl: customerInfo.managementURL ?? null,
    store: entitlement.store ?? null,
    originalAppUserId: customerInfo.originalAppUserId,
  } satisfies RevenueCatEntitlementSummary;
}

export function isRevenueCatUserCancelled(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return Boolean('userCancelled' in error && (error as { userCancelled?: boolean | null }).userCancelled);
}

export async function clearRevenueCatUser() {
  if (!isNativeRevenueCatPlatform() || !hasNativeBillingConfig()) {
    configuredAppUserId = null;
    return;
  }

  if (!(await Purchases.isConfigured())) {
    configuredAppUserId = null;
    return;
  }

  await Purchases.logOut();
  configuredAppUserId = null;
}

export async function prepareRevenueCatForUser(userId: string) {
  if (!isNativeRevenueCatPlatform() || !hasNativeBillingConfig()) {
    return false;
  }

  const apiKey = getRevenueCatApiKeyForPlatform();
  if (!apiKey) {
    return false;
  }

  if (!(await Purchases.isConfigured())) {
    Purchases.configure({
      apiKey,
      appUserID: userId,
    });
    configuredAppUserId = userId;
    return true;
  }

  if (configuredAppUserId !== userId) {
    await Purchases.logIn(userId);
    configuredAppUserId = userId;
  }

  return true;
}

export async function fetchRevenueCatState(userId: string) {
  const configured = await prepareRevenueCatForUser(userId);

  if (!configured) {
    return {
      currentPackage: null,
      customerInfo: null,
      entitlement: null,
    };
  }

  const [offerings, customerInfo] = await Promise.all([
    Purchases.getOfferings(),
    Purchases.getCustomerInfo(),
  ]);

  const currentPackage = getRevenueCatPackageSummary(
    getPrimaryRevenueCatPackage(offerings.current?.availablePackages ?? [])
  );

  return {
    currentPackage,
    customerInfo,
    entitlement: getRevenueCatEntitlementSummary(customerInfo),
  };
}

export async function syncRevenueCatProfile() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.functions.invoke('sync-revenuecat-customer', {
    body: {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function purchaseRevenueCatPro(userId: string) {
  const configured = await prepareRevenueCatForUser(userId);

  if (!configured) {
    throw new Error('RevenueCat is not configured for this build.');
  }

  const offerings = await Purchases.getOfferings();
  const selectedPackage = getPrimaryRevenueCatPackage(offerings.current?.availablePackages ?? []);

  if (!selectedPackage) {
    throw new Error('No active mobile subscription package is configured in RevenueCat.');
  }

  const purchase = await Purchases.purchasePackage(selectedPackage);

  return {
    customerInfo: purchase.customerInfo,
    currentPackage: getRevenueCatPackageSummary(selectedPackage),
    entitlement: getRevenueCatEntitlementSummary(purchase.customerInfo),
  };
}

export async function restoreRevenueCatPurchases(userId: string) {
  const configured = await prepareRevenueCatForUser(userId);

  if (!configured) {
    throw new Error('RevenueCat is not configured for this build.');
  }

  const customerInfo = await Purchases.restorePurchases();

  return {
    customerInfo,
    entitlement: getRevenueCatEntitlementSummary(customerInfo),
  };
}

export async function openRevenueCatSubscriptionManagement(customerInfo?: CustomerInfo | null) {
  if (!isNativeRevenueCatPlatform()) {
    throw new Error('Native subscription management is only available on iOS and Android.');
  }

  if (Platform.OS === 'ios') {
    await Purchases.showManageSubscriptions();
    return;
  }

  const nextCustomerInfo = customerInfo ?? (await Purchases.getCustomerInfo());
  const managementUrl = nextCustomerInfo.managementURL;

  if (!managementUrl) {
    throw new Error('No subscription management URL is available for this account yet.');
  }

  await Linking.openURL(managementUrl);
}

export function isNativeRevenueCatEnabled() {
  return isNativeRevenueCatPlatform() && hasNativeBillingConfig();
}
