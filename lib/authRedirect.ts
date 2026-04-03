import { Platform } from 'react-native';

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
  const baseUrl = getAuthBaseUrl();
  if (!baseUrl) return undefined;

  const url = new URL(path, `${baseUrl}/`);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }

  return url.toString();
}
