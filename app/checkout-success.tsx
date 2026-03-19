import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/contexts/AppStateContext';

export default function CheckoutSuccessScreen() {
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const [message, setMessage] = useState('Applying Pro access...');
    const { refreshAppState } = useAppState();

    useEffect(() => {
        async function applyFakePurchase() {
            if (!supabase) {
                setMessage('Supabase is not configured.');
                setLoading(false);
                return;
            }

            try {
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) {
                    setMessage(sessionError.message);
                    setLoading(false);
                    return;
                }

                const userId = session?.user?.id ?? null;

                if (!userId) {
                    setMessage('You must be signed in to apply Pro access.');
                    setLoading(false);
                    return;
                }

                const { error } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        is_pro: true,
                    });
                
                if (error) {
                    setMessage(error.message);
                    setLoading(false);
                    return;
                }
                
                await refreshAppState();
                setCompleted(true);
                setMessage('Pro test purchase applied successfully.');
            } finally {
                setLoading(false);
            }
        }

        applyFakePurchase();
    }, []);

    return (
        <Screen>
            <Card>
                <Heading>Upgrade Complete</Heading>
                <BodyText>
                    This is the dev purchase-success flow. It marks your account as Pro so you can test the
                    full upgrade experience before real billing is connected.
                </BodyText>
            </Card>

            <Card>
                <Label>Status</Label>

                {loading ? (
                    <View style={styles.row}>
                        <ActivityIndicator />
                        <BodyText>{message}</BodyText>
                    </View>
                ) : (
                    <BodyText>{message}</BodyText>
                )}

                {completed ? (
                    <>
                        <BodyText>• Pro access should now be active on this account</BodyText>
                        <BodyText>• Tool screens will refresh when you revisit them</BodyText>

                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => router.push('/(tabs)/account')}
                        >
                            <Label style={styles.primaryButtonText}>Go to Account</Label>
                        </Pressable>

                        <Pressable
                            style={styles.secondaryButton}
                            onPress={() => router.push('/(tabs)/xp')}
                        >
                            <Label style={styles.secondaryButtonText}>Back to Tools</Label>
                        </Pressable>
                    </>
                ) : !loading ? (
                    <Pressable
                        style={styles.secondaryButton}
                        onPress={() => router.push('/pricing')}
                    >
                        <Label style={styles.secondaryButtonText}>Back to Pricing</Label>
                    </Pressable>
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
        backgroundColor: '#6d28d9',
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