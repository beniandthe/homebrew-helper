import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { AppStateProvider } from '@/contexts/AppStateContext';

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.text,
          contentStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Homebrew Helper' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pricing" options={{ title: 'Pricing' }} />
        <Stack.Screen name="checkout" options={{ title: 'Billing' }} />
        <Stack.Screen name="checkout-success" options={{ title: 'Checkout Success' }} />
        <Stack.Screen name="checkout-cancel" options={{ title: 'Checkout Canceled' }} />
        <Stack.Screen name="auth/confirm" options={{ title: 'Confirm Email' }} />
        <Stack.Screen name="project-roadmap" options={{ title: 'Project Roadmap' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
        <Stack.Screen name="terms-of-service" options={{ title: 'Terms of Service' }} />
      </Stack>
    </AppStateProvider>
  );
}
