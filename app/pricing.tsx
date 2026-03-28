import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppState } from '@/contexts/AppStateContext';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBanner, type StatusBannerVariant } from '@/components/StatusBanner';


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

export default function PricingScreen() {
    const [busy, setBusy] = useState(false);
    const [loadingBillingState, setLoadingBillingState] = useState(false);
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
    const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
    const [canceledAt, setCanceledAt] = useState<string | null>(null);

    const enableDevBilling = process.env.EXPO_PUBLIC_ENABLE_DEV_BILLING === 'true';
    const params = useLocalSearchParams<{ checkout?: string }>();
    const { loading, isPro, isSignedIn, userId, refreshAppState } = useAppState();

    const [statusBanner, setStatusBanner] = useState<{
        title?: string;
        message: string;
        variant: StatusBannerVariant;
    } | null>(null);

    function setBanner(
        variant: StatusBannerVariant,
        title: string,
        message: string
    ) {
        setStatusBanner({ variant, title, message });
    }

    async function loadBillingState(nextUserId: string) {
        if (!supabase) return;

        try {
            setLoadingBillingState(true);

            const { data, error } = await supabase
                .from('profiles')
                .select('cancel_at_period_end, current_period_end, canceled_at')
                .eq('id', nextUserId)
                .maybeSingle();

            if (error) {
                setBanner('error', 'Plan load failed', error.message);
                return;
            }

            setCancelAtPeriodEnd(Boolean(data?.cancel_at_period_end));
            setCurrentPeriodEnd(data?.current_period_end ?? null);
            setCanceledAt(data?.canceled_at ?? null);
        } finally {
            setLoadingBillingState(false);
        }
    }

    useEffect(() => {
        if (!userId || !isSignedIn) {
            setCancelAtPeriodEnd(false);
            setCurrentPeriodEnd(null);
            setCanceledAt(null);
            return;
        }

        loadBillingState(userId);
    }, [userId, isSignedIn, isPro]);

    useEffect(() => {
        if (params.checkout === 'success') {
            setBanner(
                'success',
                'Purchase completed',
                'Your Pro access is active on this account.'
            );
            refreshAppState();
            if (userId) {
                loadBillingState(userId);
            }
        }

        if (params.checkout === 'cancelled') {
            setBanner(
                'info',
                'Checkout canceled',
                'Your subscription was not changed.'
            );
        }
    }, [params.checkout, refreshAppState, userId]);

    async function handleUpgradePress() {
        if (!supabase) {
            setBanner('error', 'Supabase not configured', 'Missing Supabase configuration.');
            return;
        }

        if (!isSignedIn || !userId) {
            setBanner('error', 'Sign in required', 'Please sign in before upgrading to Pro.');
            return;
        }

        if (isPro && !cancelAtPeriodEnd) {
            setBanner('info', 'Pro already active', 'Your account already has Pro enabled.');
            return;
        }

        try {
            setBusy(true);

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {},
            });

            if (error) {
                setBanner('error', 'Checkout failed', error.message);
                return;
            }

            if (!data?.url) {
                setBanner('error', 'Checkout failed', 'No checkout URL was returned.');
                return;
            }

            if (Platform.OS === 'web') {
                window.location.href = data.url;
                return;
            }

            setBanner(
                'info',
                'Web checkout required',
                'Stripe checkout is currently set up for web only.'
            );
        } finally {
            setBusy(false);
        }
    }

    async function handleManageSubscriptionPress() {
        if (!supabase) {
            setBanner('error', 'Supabase not configured', 'Missing Supabase configuration.');
            return;
        }

        if (!isSignedIn || !userId) {
            setBanner('error', 'Sign in required', 'Please sign in before managing your subscription.');
            return;
        }

        if (!isPro) {
            setBanner('info', 'No active Pro plan', 'Upgrade to Pro before managing a subscription.');
            return;
        }

        try {
            setBusy(true);

            const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
                body: {},
            });

            if (error) {
                setBanner('error', 'Portal failed', error.message);
                return;
            }

            if (!data?.url) {
                setBanner('error', 'Portal failed', 'No portal URL was returned.');
                return;
            }

            if (Platform.OS === 'web') {
                window.location.href = data.url;
                return;
            }

            setBanner(
                'info',
                'Web portal required',
                'Subscription management is currently set up for web only.'
            );
        } finally {
            setBusy(false);
        }
    }

    async function handleDisableProDev() {
        if (!supabase || !userId) return;

        const confirmed =
            Platform.OS === 'web'
                ? window.confirm(
                    'Disabling Pro will permanently delete Campaign Hub workspaces, linked campaign projects, and any standalone projects beyond the 3-project free limit. Continue?'
                )
                : await new Promise<boolean>((resolve) => {
                    Alert.alert(
                        'Disable Pro',
                        'This will permanently delete Campaign Hub workspaces, linked campaign projects, and any standalone projects beyond the 3-project free limit.',
                        [
                            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                            { text: 'Continue', style: 'destructive', onPress: () => resolve(true) },
                        ]
                    );
                });

        if (!confirmed) return;

        try {
            setBusy(true);

            const { error } = await supabase.rpc('downgrade_to_free_and_trim_projects', {
                target_user_id: userId,
            });

            if (error) {
                setBanner('error', 'Downgrade failed', error.message);
                return;
            }

            await refreshAppState();
            setCancelAtPeriodEnd(false);
            setCurrentPeriodEnd(null);
            setCanceledAt(null);

            setBanner(
                'success',
                'Pro disabled',
                'Dev Pro access has been removed. Campaigns, linked campaign projects, and extra standalone projects beyond the free limit were deleted.'
            );
        } finally {
            setBusy(false);
        }
    }

    const formattedPeriodEnd = formatPlanDate(currentPeriodEnd);
    const formattedCanceledAt = formatPlanDate(canceledAt);

    function renderPlanText() {
        if (!isSignedIn) {
            return 'Not signed in. Sign in to view and manage your plan.';
        }

        if (loadingBillingState || loading) {
            return 'Loading plan...';
        }

        if (isPro && cancelAtPeriodEnd && formattedPeriodEnd) {
            return `Pro has been canceled and remains active until ${formattedPeriodEnd}.`;
        }

        if (isPro) {
            return 'Pro is active and renews automatically.';
        }

        return 'Free plan active. You can save up to 3 total projects.';
    }

    return (
        <Screen>
            <ScrollView contentContainerStyle={styles.content}>
                <Card>
                    <Heading>Pricing & Subscription</Heading>
                    <BodyText>
                        Manage your current plan and upgrade when you need unlimited saved projects.
                    </BodyText>
                </Card>

                {statusBanner ? (
                    <StatusBanner
                        title={statusBanner.title}
                        message={statusBanner.message}
                        variant={statusBanner.variant}
                        onDismiss={() => setStatusBanner(null)}
                    />
                ) : null}

                <Card>
                    <Label>Current Plan</Label>
                    {loading || loadingBillingState ? (
                        <View style={styles.row}>
                            <ActivityIndicator />
                            <BodyText>Loading plan...</BodyText>
                        </View>
                    ) : (
                        <BodyText>{renderPlanText()}</BodyText>
                    )}

                    {isPro && cancelAtPeriodEnd && formattedCanceledAt ? (
                        <BodyText style={styles.subtleText}>
                            Cancellation was requested on {formattedCanceledAt}.
                        </BodyText>
                    ) : null}
                </Card>

                <Card>
                    <Label>Manage Subscription</Label>

                    {!isSignedIn ? (
                        <BodyText>Sign in first to manage billing and account access.</BodyText>
                    ) : isPro ? (
                        <>
                            <BodyText>
                                {cancelAtPeriodEnd && formattedPeriodEnd
                                    ? `Your subscription is set to end on ${formattedPeriodEnd}. You can still manage billing and payment details through Stripe until then.`
                                    : 'You currently have Pro access. Manage billing, payment method, and cancellation through Stripe.'}
                            </BodyText>

                            <Pressable
                                style={[styles.secondaryButton, (busy || loading || loadingBillingState) && styles.buttonDisabled]}
                                onPress={handleManageSubscriptionPress}
                                disabled={busy || loading || loadingBillingState}
                            >
                                <Label style={styles.secondaryButtonText}>
                                    {busy ? 'Opening...' : 'Manage Subscription'}
                                </Label>
                            </Pressable>

                            {enableDevBilling ? (
                                <Pressable
                                    style={[styles.dangerButton, (busy || loading) && styles.buttonDisabled]}
                                    onPress={handleDisableProDev}
                                    disabled={busy || loading}
                                >
                                    <Label style={styles.primaryButtonText}>
                                        {busy ? 'Working...' : 'Disable Pro (Dev Only)'}
                                    </Label>
                                </Pressable>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <BodyText>
                                Upgrade to Pro to unlock unlimited saved projects and Campaign Hub organization.
                            </BodyText>

                            <Pressable
                                style={[styles.primaryButton, (busy || loading || loadingBillingState) && styles.buttonDisabled]}
                                onPress={handleUpgradePress}
                                disabled={busy || loading || loadingBillingState}
                            >
                                <Label style={styles.primaryButtonText}>
                                    {busy ? 'Opening...' : 'Upgrade to Pro'}
                                </Label>
                            </Pressable>
                        </>
                    )}
                </Card>

                <View style={styles.planGrid}>
                    <Card>
                        <Label>Free</Label>
                        <Heading>Starter</Heading>
                        <BodyText>Good for trying the toolkit and saving a few ideas.</BodyText>

                        <View style={styles.featureList}>
                            <BodyText>• 3 saved projects total</BodyText>
                            <BodyText>• Access to all core tools</BodyText>
                            <BodyText>• Save, load, update, duplicate</BodyText>
                            <BodyText>• Great for light use</BodyText>
                        </View>
                    </Card>

                    <Card>
                        <Label>Pro</Label>
                        <Heading>Unlimited</Heading>
                        <BodyText>Built for active GMs, designers, and long-running projects.</BodyText>

                        <View style={styles.featureList}>
                            <BodyText>• Unlimited saved projects</BodyText>
                            <BodyText>• Campaign Hub access</BodyText>
                            <BodyText>• Linked campaign workflows</BodyText>
                            <BodyText>• Future premium features</BodyText>
                        </View>
                    </Card>
                </View>

                <Card>
                    <Label>Current Pricing</Label>
                    <Heading>$4.99 / month</Heading>
                    <BodyText>
                        Monthly Pro unlocks unlimited saves and Campaign Hub organization.
                    </BodyText>
                </Card>

                <View style={styles.footerActions}>
                    <Pressable style={styles.linkButton} onPress={() => router.push('/(tabs)/account')}>
                        <Label>Go to Account</Label>
                    </Pressable>

                    <Pressable style={styles.linkButton} onPress={() => router.back()}>
                        <Label>Back</Label>
                    </Pressable>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: {
        gap: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    subtleText: {
        marginTop: Spacing.sm,
        opacity: 0.75,
    },
    planGrid: {
        gap: Spacing.md,
    },
    featureList: {
        gap: 6,
        marginTop: Spacing.sm,
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
    dangerButton: {
        backgroundColor: '#b42318',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.sm,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    footerActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        flexWrap: 'wrap',
    },
    linkButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
});