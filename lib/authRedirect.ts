import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

function normalizeBaseUrl(value: string | null | undefined) {
  if (!value) return null;

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function getAuthBaseUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  return normalizeBaseUrl(process.env.EXPO_PUBLIC_APP_URL);
}

export function buildAuthRedirectUrl(
  path: string,
  params?: Record<string, string | null | undefined>
) {
  const queryParams = Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => Boolean(value))
  ) as Record<string, string>;

  if (Platform.OS !== 'web') {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return Linking.createURL(normalizedPath, { queryParams });
  }

  const baseUrl = getAuthBaseUrl();
  if (!baseUrl) return undefined;

  const url = new URL(path, `${baseUrl}/`);

  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
