import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useAppState } from '@/contexts/AppStateContext';
import { AppInput } from '@/components/AppInput';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const configured = Boolean(supabase);

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [isPro, setIsPro] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const userEmail = useMemo(() => session?.user?.email ?? '', [session]);
  const userId = session?.user?.id ?? null;
  const { refreshAppState } = useAppState();

  async function loadPlan(nextUserId: string) {
    if (!supabase) return;

    try {
      setLoadingPlan(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', nextUserId)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        return;
      }

      setIsPro(Boolean(data?.is_pro));
    } finally {
      setLoadingPlan(false);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoadingSession(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;

      if (error) {
        setMessage(error.message);
      }

      const nextSession = data.session ?? null;
      setSession(nextSession);
      setLoadingSession(false);

      if (nextSession?.user?.id) {
        await loadPlan(nextSession.user.id);
      } else {
        setIsPro(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user?.id) {
        await loadPlan(nextSession.user.id);
      } else {
        setIsPro(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage('Account created. Check your email if confirmation is enabled.');
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

  return (
    <Screen>
      <Card>
        <Heading>Account & Pro</Heading>
        <BodyText>
          Authentication, account status, and Pro entitlement testing.
        </BodyText>
      </Card>

      <Card>
        <Label>Current status</Label>
        <BodyText>
          {configured ? 'Supabase connected.' : 'Supabase not configured yet.'}
        </BodyText>
        {loadingSession ? (
          <View style={styles.row}>
            <ActivityIndicator />
            <BodyText>Checking session...</BodyText>
          </View>
        ) : session ? (
          <BodyText>Signed in as: {userEmail}</BodyText>
        ) : (
          <BodyText>No active session.</BodyText>
        )}
      </Card>

      {session ? (
        <>
          <Card>
            <Label>Plan</Label>
            {loadingPlan ? (
              <View style={styles.row}>
                <ActivityIndicator />
                <BodyText>Loading plan...</BodyText>
              </View>
            ) : (
              <BodyText>{isPro ? 'Pro plan active.' : 'Free plan active.'}</BodyText>
            )}

            <Pressable
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={handleTogglePro}
              disabled={busy || loadingPlan}
            >
              <Label style={styles.buttonText}>
                {busy
                  ? 'Working...'
                  : isPro
                    ? 'Disable Pro Test Mode'
                    : 'Enable Pro Test Mode'}
              </Label>
            </Pressable>
          </Card>

          <Card>
            <Label>Account</Label>
            <BodyText>{userEmail}</BodyText>

            <Pressable
              style={[styles.buttonSecondary, busy && styles.buttonDisabled]}
              onPress={handleSignOut}
              disabled={busy}
            >
              <Label style={styles.buttonText}>Sign Out</Label>
            </Pressable>

            {message ? <BodyText>{message}</BodyText> : null}
          </Card>
        </>
      ) : (
        <Card>
          <Label>Email</Label>
          <AppInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
          />

          <Label>Password</Label>
          <AppInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimum 6 characters"
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={busy || !configured}
            >
              <Label style={styles.buttonText}>{busy ? 'Working...' : 'Sign Up'}</Label>
            </Pressable>

            <Pressable
              style={[styles.buttonSecondary, busy && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={busy || !configured}
            >
              <Label style={styles.buttonText}>Sign In</Label>
            </Pressable>
          </View>

          {message ? <BodyText>{message}</BodyText> : null}
        </Card>
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
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  buttonSecondary: {
    backgroundColor: Colors.elevated,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
  },
});