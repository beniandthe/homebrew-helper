import { Platform } from 'react-native';

export const DEFAULT_PRO_ENTITLEMENT_ID = 'pro';

export function getProEntitlementId() {
  return process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? DEFAULT_PRO_ENTITLEMENT_ID;
}

export function getRevenueCatApiKeyForPlatform(platform = Platform.OS) {
  if (platform === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  }

  if (platform === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  }

  return undefined;
}

export function hasNativeBillingConfig(platform = Platform.OS) {
  if (platform !== 'ios' && platform !== 'android') {
    return false;
  }

  return Boolean(getRevenueCatApiKeyForPlatform(platform));
}
