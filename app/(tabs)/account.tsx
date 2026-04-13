import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useAppState } from '@/contexts/AppStateContext';
import { useBilling } from '@/contexts/BillingContext';
import { AppInput } from '@/components/AppInput';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { buildAuthRedirectUrl } from '@/lib/authRedirect';
import { formatBillingProvider, formatBillingStore } from '@/lib/billing';
import { supabase } from '@/lib/supabase';
import { isNativePlanPreview } from '@/lib/subscriptionUi';

function formatPlanDate(value: string | null) {
  if (!value) return null;

  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

export default function AccountScreen() {
  const configured = Boolean(supabase);
  const enableDevBilling = process.env.EXPO_PUBLIC_ENABLE_DEV_BILLING === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const { session, userId, isSignedIn, isPro, billingProfile, loading, refreshAppState } = useAppState();
  const {
    billingBusy,
    billingProvider,
    canManageSubscription,
    canRestorePurchases,
    currentPackage,
    nativeEntitlement,
    loadingBillingState,
    manageSubscription,
    restorePurchases,
  } = useBilling();

  const userEmail = session?.user?.email ?? '';
  const cancelAtPeriodEnd = Boolean(billingProfile?.cancel_at_period_end);
  const currentPeriodEnd = billingProfile?.current_period_end ?? null;
  const emailRedirectTo = buildAuthRedirectUrl('/auth/confirm', { next: '/account' });

  async function handleSignUp() {
    if (!supabase) return;
    if (!email.trim() || !password.trim()) {
      setMessage('Enter an email and password.');
      return;
    }

    try {
      setBusy(true);
      setMessage('');

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: emailRedirectTo
          ? {
              emailRedirectTo,
            }
          : undefined,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage('Account created. Check your email if confirmation is enabled.');
      await refreshAppState({ silent: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleResendConfirmation() {
    if (!supabase) return;
    if (!email.trim()) {
      setMessage('Enter your email address first.');
      return;
    }

    try {
      setBusy(true);
      setMessage('');

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: emailRedirectTo
          ? {
              emailRedirectTo,
            }
          : undefined,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage('Verification email resent. Check your inbox.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    if (!supabase) return;
    if (!email.trim() || !password.trim()) {
      setMessage('Enter an email and password.');
      return;
    }

    try {
      setBusy(true);
      setMessage('');

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage('Signed in successfully.');
      await refreshAppState({ silent: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;

    try {
      setBusy(true);
      setMessage('');

      const { error } = await supabase.auth.signOut();

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage('Signed out.');
      await refreshAppState({ silent: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePro() {
    if (!supabase || !userId) return;

    try {
      setBusy(true);
      setMessage('');

      const nextValue = !isPro;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          is_pro: nextValue,
          cancel_at_period_end: false,
          current_period_end: null,
        });

      if (error) {
        setMessage(error.message);
        return;
      }

      await refreshAppState();
      setMessage(nextValue ? 'Pro test mode enabled.' : 'Pro test mode disabled.');
    } finally {
      setBusy(false);
    }
  }

  const formattedPeriodEnd = formatPlanDate(currentPeriodEnd);

  function renderPlanSummary() {
    if (loading || loadingBillingState) {
      return 'Loading plan...';
    }

    if (isPro && cancelAtPeriodEnd && formattedPeriodEnd) {
      return `Plan: Pro (canceled, active until ${formattedPeriodEnd})`;
    }

    if (isPro) {
      return 'Plan: Pro';
    }

    return 'Plan: Free';
  }

  async function handleManageSubscription() {
    try {
      setMessage('');
      await manageSubscription();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to manage your subscription.');
    }
  }

  async function handleRestorePurchases() {
    try {
      setMessage('');
      const result = await restorePurchases();

      if (result.status === 'cancelled') {
        setMessage('Restore canceled.');
        return;
      }

      setMessage('Purchases restored successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to restore purchases.');
    }
  }

  return (
    <Screen>
      <Card>
        <Heading>Account & Pro</Heading>
        <BodyText>
          Authentication, account status, and subscription access.
        </BodyText>
      </Card>

      <Card>
        <Label>Current status</Label>
        <BodyText>
          {configured ? 'Supabase connected.' : 'Supabase not configured yet.'}
        </BodyText>
        {loading ? (
          <View style={styles.row}>
            <ActivityIndicator />
            <BodyText>Checking session...</BodyText>
          </View>
        ) : isSignedIn ? (
          <BodyText>Signed in as: {userEmail}</BodyText>
        ) : (
          <BodyText>No active session.</BodyText>
        )}
      </Card>

      {isSignedIn ? (
        <>
          <Card>
            <Label>Plan</Label>
            {loading || loadingBillingState ? (
              <View style={styles.row}>
                <ActivityIndicator />
                <BodyText>Loading plan...</BodyText>
              </View>
            ) : (
              <>
                <BodyText>{renderPlanSummary()}</BodyText>
                {isPro && cancelAtPeriodEnd && formattedPeriodEnd ? (
                  <BodyText style={styles.subtleText}>
                    Subscription access remains active until {formattedPeriodEnd}.
                  </BodyText>
                ) : null}

                <BodyText style={styles.subtleText}>
                  Provider: {billingProvider === 'none' ? (isNativePlanPreview ? 'Mobile beta preview' : 'Not configured') : formatBillingProvider(billingProvider)}
                </BodyText>

                {billingProfile?.billing_store ? (
                  <BodyText style={styles.subtleText}>
                    Store: {formatBillingStore(billingProfile.billing_store)}
                  </BodyText>
                ) : null}

                {currentPackage?.priceString ? (
                  <BodyText style={styles.subtleText}>
                    Current offer: {currentPackage.priceString} / month
                  </BodyText>
                ) : null}

                {nativeEntitlement?.latestExpirationDate ? (
                  <BodyText style={styles.subtleText}>
                    Latest store expiration: {formatPlanDate(nativeEntitlement.latestExpirationDate)}
                  </BodyText>
                ) : null}
              </>
            )}

            {canManageSubscription ? (
              <Pressable
                style={[styles.buttonSecondary, (billingBusy || busy || loading || loadingBillingState) && styles.buttonDisabled]}
                onPress={handleManageSubscription}
                disabled={billingBusy || busy || loading || loadingBillingState}
              >
                <Label style={styles.buttonText}>
                  {billingBusy ? 'Working...' : 'Manage Subscription'}
                </Label>
              </Pressable>
            ) : null}

            {canRestorePurchases ? (
              <Pressable
                style={[styles.buttonSecondary, (billingBusy || busy || loading || loadingBillingState) && styles.buttonDisabled]}
                onPress={handleRestorePurchases}
                disabled={billingBusy || busy || loading || loadingBillingState}
              >
                <Label style={styles.buttonText}>
                  {billingBusy ? 'Working...' : 'Restore Purchases'}
                </Label>
              </Pressable>
            ) : null}

            {enableDevBilling ? (
              <Pressable
                style={[styles.button, (busy || billingBusy) && styles.buttonDisabled]}
                onPress={handleTogglePro}
                disabled={busy || billingBusy || loading || loadingBillingState}
              >
                <Label style={styles.buttonText}>
                  {busy
                    ? 'Working...'
                    : isPro
                      ? 'Disable Pro Test Mode'
                      : 'Enable Pro Test Mode'}
                </Label>
              </Pressable>
            ) : null}
          </Card>

          <Card>
            <Label>Account</Label>
            <BodyText>{userEmail}</BodyText>

            <Pressable
              style={[styles.buttonSecondary, (busy || billingBusy) && styles.buttonDisabled]}
              onPress={handleSignOut}
              disabled={busy || billingBusy}
            >
              <Label style={styles.buttonText}>Sign Out</Label>
            </Pressable>

            {message ? <BodyText style={styles.message}>{message}</BodyText> : null}
          </Card>
        </>
      ) : (
        <>
          <Card>
            <Label>Email</Label>
            <AppInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Label>Password</Label>
            <AppInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
            />

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.button, (busy || billingBusy) && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={busy || billingBusy}
              >
                <Label style={styles.buttonText}>{busy ? 'Working...' : 'Sign In'}</Label>
              </Pressable>

              <Pressable
                style={[styles.buttonSecondary, (busy || billingBusy) && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={busy || billingBusy}
              >
                <Label style={styles.buttonText}>Sign Up</Label>
              </Pressable>
            </View>

            <Pressable
              style={[styles.buttonSecondary, (busy || billingBusy) && styles.buttonDisabled]}
              onPress={handleResendConfirmation}
              disabled={busy || billingBusy}
            >
              <Label style={styles.buttonText}>Resend Verification Email</Label>
            </Pressable>

            {message ? <BodyText style={styles.message}>{message}</BodyText> : null}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
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
  buttonText: {
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  message: {
    marginTop: Spacing.sm,
  },
  subtleText: {
    marginTop: Spacing.sm,
    opacity: 0.75,
  },
});
