import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { EmailOtpType } from '@supabase/supabase-js';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/contexts/AppStateContext';

type VerificationState =
  | { kind: 'loading'; title: string; message: string }
  | { kind: 'success'; title: string; message: string }
  | { kind: 'error'; title: string; message: string };

const VALID_EMAIL_OTP_TYPES: ReadonlySet<EmailOtpType> = new Set([
  'email',
  'signup',
  'recovery',
  'invite',
  'email_change',
]);
const ALLOWED_NEXT_PATHS = ['/', '/account', '/campaign', '/pricing'] as const satisfies readonly Href[];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHashParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(rawHash);
}

async function waitForSession() {
  if (!supabase) return null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      return session;
    }

    await wait(400);
  }

  return null;
}

export default function AuthConfirmScreen() {
  const params = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>();
  const { refreshAppState } = useAppState();
  const [state, setState] = useState<VerificationState>({
    kind: 'loading',
    title: 'Verifying email',
    message: 'We are confirming your email and finishing sign-in.',
  });

  const nextPath = useMemo(() => {
    const value = typeof params.next === 'string' ? params.next : null;
    return ALLOWED_NEXT_PATHS.find((path) => path === value) ?? '/account';
  }, [params.next]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!supabase) {
        if (!cancelled) {
          setState({
            kind: 'error',
            title: 'Supabase not configured',
            message: 'Authentication is not configured in this app build.',
          });
        }
        return;
      }

      const hashParams = getHashParams();
      const hashError = hashParams.get('error_description') ?? hashParams.get('error');

      if (hashError) {
        if (!cancelled) {
          setState({
            kind: 'error',
            title: 'Verification failed',
            message: hashError,
          });
        }
        return;
      }

      const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : null;
      const rawType = typeof params.type === 'string' ? params.type : null;
      const otpType = rawType && VALID_EMAIL_OTP_TYPES.has(rawType as EmailOtpType)
        ? (rawType as EmailOtpType)
        : null;

      try {
        if (tokenHash && otpType) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (error) {
            throw error;
          }
        }

        const session = await waitForSession();

        if (!session?.user) {
          throw new Error(
            'Your link was opened, but we could not finish sign-in automatically. Please return to the account page and sign in or request a new verification email.'
          );
        }

        await refreshAppState({ silent: true });

        if (!cancelled) {
          setState({
            kind: 'success',
            title: 'Email verified',
            message: `Your account is confirmed and you are signed in as ${session.user.email ?? 'your account'}.`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: 'error',
            title: 'Verification failed',
            message:
              error instanceof Error
                ? error.message
                : 'We could not verify your email link.',
          });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [params.token_hash, params.type, refreshAppState]);

  return (
    <Screen>
      <Card>
        <Heading>{state.title}</Heading>
        <BodyText>{state.message}</BodyText>
      </Card>

      <Card>
        {state.kind === 'loading' ? (
          <View style={styles.row}>
            <ActivityIndicator />
            <BodyText>Finishing authentication...</BodyText>
          </View>
        ) : null}

        {state.kind === 'success' ? (
          <>
            <BodyText>
              You can go straight to your account, or head back to pricing if you were on your way to billing.
            </BodyText>

            <Pressable style={styles.primaryButton} onPress={() => router.replace(nextPath)}>
              <Label style={styles.primaryButtonText}>Continue</Label>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/pricing')}>
              <Label style={styles.secondaryButtonText}>Go To Pricing</Label>
            </Pressable>
          </>
        ) : null}

        {state.kind === 'error' ? (
          <>
            <BodyText>
              If the link expired or has already been used, go back to the account page and request another verification email.
            </BodyText>

            <Pressable style={styles.primaryButton} onPress={() => router.replace('/account')}>
              <Label style={styles.primaryButtonText}>Go To Account</Label>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
              <Label style={styles.secondaryButtonText}>Back To Home</Label>
            </Pressable>
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: Colors.elevated,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.text,
  },
});
