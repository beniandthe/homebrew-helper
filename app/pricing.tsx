import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppState } from '@/contexts/AppStateContext';
import { useBilling } from '@/contexts/BillingContext';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBanner, type StatusBannerVariant } from '@/components/StatusBanner';
import { hasActiveProAccess } from '@/lib/billing';
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

export default function PricingScreen() {
    const [busy, setBusy] = useState(false);

    const enableDevBilling = process.env.EXPO_PUBLIC_ENABLE_DEV_BILLING === 'true';
    const params = useLocalSearchParams<{ checkout?: string }>();
    const { loading, isPro, isSignedIn, userId, billingProfile, refreshAppState } = useAppState();
    const {
        billingBusy,
        billingConfigured,
        billingProvider,
        canManageSubscription,
        canPurchase,
        canRestorePurchases,
        currentPackage,
        loadingBillingState,
        nativeEntitlement,
        manageSubscription,
        purchasePro,
        restorePurchases,
    } = useBilling();

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

    const cancelAtPeriodEnd = Boolean(billingProfile?.cancel_at_period_end);
    const currentPeriodEnd = billingProfile?.current_period_end ?? null;
    const canceledAt = billingProfile?.canceled_at ?? null;

    useEffect(() => {
        if (params.checkout === 'success') {
            setBanner(
                'success',
                'Purchase completed',
                'Your Pro access is active on this account.'
            );
            void refreshAppState({ silent: true });
        } else if (params.checkout === 'cancelled') {
            setBanner(
                'info',
                'Checkout canceled',
                'Your subscription was not changed.'
            );
        }
    }, [params.checkout, refreshAppState]);

    async function handleUpgradePress() {
        if (!isSignedIn || !userId) {
            setBanner('error', 'Sign in required', 'Please sign in before upgrading to Pro.');
            return;
        }

        if (effectivePro && !cancelAtPeriodEnd) {
            setBanner('info', 'Pro already active', 'Your account already has Pro enabled.');
            return;
        }

        if (isNativePlanPreview) {
            setBanner(
                'info',
                'Mobile Pro coming soon',
                'Add your RevenueCat keys and store products to enable native subscriptions in this build.'
            );
            return;
        }

        try {
            const result = await purchasePro();

            if (result.status === 'cancelled') {
                setBanner('info', 'Purchase canceled', 'Your subscription was not changed.');
                return;
            }

            if (billingProvider === 'revenuecat') {
                setBanner('success', 'Purchase completed', 'Your Pro access is active on this account.');
            }
        } catch (error) {
            setBanner('error', 'Checkout failed', error instanceof Error ? error.message : 'Unknown billing error.');
        }
    }

    async function handleManageSubscriptionPress() {
        if (!isSignedIn || !userId) {
            setBanner('error', 'Sign in required', 'Please sign in before managing your subscription.');
            return;
        }

        if (!effectivePro) {
            setBanner('info', 'No active Pro plan', 'Upgrade to Pro before managing a subscription.');
            return;
        }

        try {
            await manageSubscription();
        } catch (error) {
            setBanner('error', 'Subscription management failed', error instanceof Error ? error.message : 'Unknown billing error.');
        }
    }

    async function handleRestorePurchasesPress() {
        if (!isSignedIn || !userId) {
            setBanner('error', 'Sign in required', 'Please sign in before restoring purchases.');
            return;
        }

        try {
            const result = await restorePurchases();

            if (result.status === 'cancelled') {
                setBanner('info', 'Restore canceled', 'No changes were applied to your account.');
                return;
            }

            setBanner('success', 'Purchases restored', 'Your store purchases have been synced to this account.');
        } catch (error) {
            setBanner('error', 'Restore failed', error instanceof Error ? error.message : 'Unknown billing error.');
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

            setBanner(
                'success',
                'Pro disabled',
                'Dev Pro access has been removed. Campaigns, linked campaign projects, and extra standalone projects beyond the free limit were deleted.'
            );
        } finally {
            setBusy(false);
        }
    }

    const effectivePro = hasActiveProAccess({
        is_pro: isPro,
        cancel_at_period_end: cancelAtPeriodEnd,
        current_period_end: currentPeriodEnd,
        canceled_at: canceledAt,
    });

    const formattedPeriodEnd = formatPlanDate(currentPeriodEnd);
    const formattedCanceledAt = formatPlanDate(canceledAt);

    function renderPlanText() {
        if (!isSignedIn) {
            return 'Not signed in. Sign in to view and manage your plan.';
        }

        if (loading || loadingBillingState) {
            return 'Loading plan...';
        }

        if (effectivePro && cancelAtPeriodEnd && formattedPeriodEnd) {
            if (billingProvider === 'revenuecat') {
                return `Pro is active until ${formattedPeriodEnd}. Manage renewal and cancellation through ${Platform.OS === 'ios' ? 'the App Store' : 'Google Play'}.`;
            }

            return isNativePlanPreview
                ? `Pro access remains active until ${formattedPeriodEnd}. Native subscription changes are not available in this mobile beta yet.`
                : `Pro has been canceled and remains active until ${formattedPeriodEnd}.`;
        }

        if (effectivePro) {
            if (billingProvider === 'revenuecat') {
                return `Pro is active through ${Platform.OS === 'ios' ? 'the App Store' : 'Google Play'}.`;
            }

            return isNativePlanPreview
                ? 'Pro access is active on this account. Native subscription management is not wired up in this beta build yet.'
                : 'Pro is active and renews automatically.';
        }

        if (billingProvider === 'revenuecat' && billingConfigured) {
            return 'Free plan active. Subscribe on your device store to unlock Pro.';
        }

        return isNativePlanPreview
            ? 'Mobile beta currently includes the free plan. Core tools and saved projects are available now.'
            : 'Free plan active. You can save up to 3 total projects.';
    }

    return (
        <Screen>
            <ScrollView contentContainerStyle={styles.content}>
                <Card>
                    <Heading>
                        {isNativePlanPreview ? 'Plans & Mobile Beta' : 'Pricing & Subscription'}
                    </Heading>
                    <BodyText>
                        {billingProvider === 'revenuecat'
                            ? 'Manage your current plan, restore purchases, and subscribe through the device store.'
                            : isNativePlanPreview
                            ? 'Review what is live on mobile today and how Pro will expand in a later native release.'
                            : 'Manage your current plan and upgrade when you need unlimited saved projects.'}
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

                    {effectivePro && cancelAtPeriodEnd && formattedCanceledAt ? (
                        <BodyText style={styles.subtleText}>
                            Cancellation was requested on {formattedCanceledAt}.
                        </BodyText>
                    ) : null}
                </Card>

                <Card>
                    <Label>Manage Subscription</Label>

                    {!isSignedIn ? (
                        <BodyText>Sign in first to manage billing and account access.</BodyText>
                    ) : effectivePro ? (
                        <>
                            <BodyText>
                                {billingProvider === 'revenuecat'
                                    ? `Your current Pro access is linked through ${Platform.OS === 'ios' ? 'the App Store' : 'Google Play'}.`
                                    : isNativePlanPreview
                                        ? 'Pro access is active on your account. Native subscription management is not wired up in this beta build yet.'
                                        : cancelAtPeriodEnd && formattedPeriodEnd
                                        ? `Your subscription is set to end on ${formattedPeriodEnd}. You can still manage billing and payment details through Stripe until then.`
                                        : 'You currently have Pro access. Manage billing, payment method, and cancellation through Stripe.'}
                            </BodyText>

                            {canManageSubscription ? (
                                <Pressable
                                    style={[styles.secondaryButton, (billingBusy || busy || loading || loadingBillingState) && styles.buttonDisabled]}
                                    onPress={handleManageSubscriptionPress}
                                    disabled={billingBusy || busy || loading || loadingBillingState}
                                >
                                    <Label style={styles.secondaryButtonText}>
                                        {billingBusy ? 'Opening...' : 'Manage Subscription'}
                                    </Label>
                                </Pressable>
                            ) : null}

                            {canRestorePurchases ? (
                                <Pressable
                                    style={[styles.secondaryButton, (billingBusy || busy || loading || loadingBillingState) && styles.buttonDisabled]}
                                    onPress={handleRestorePurchasesPress}
                                    disabled={billingBusy || busy || loading || loadingBillingState}
                                >
                                    <Label style={styles.secondaryButtonText}>
                                        {billingBusy ? 'Working...' : 'Restore Purchases'}
                                    </Label>
                                </Pressable>
                            ) : null}

                            {enableDevBilling ? (
                                <Pressable
                                    style={[styles.dangerButton, (busy || billingBusy || loading || loadingBillingState) && styles.buttonDisabled]}
                                    onPress={handleDisableProDev}
                                    disabled={busy || billingBusy || loading || loadingBillingState}
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
                                {billingProvider === 'revenuecat'
                                    ? 'Subscribe on your device store to unlock unlimited saves and Campaign Hub access on this account.'
                                    : isNativePlanPreview
                                    ? 'Mobile beta currently ships the free toolkit and save flow. Native Pro subscriptions and Campaign Hub unlocks are planned for a later release.'
                                    : 'Upgrade to Pro to unlock unlimited saved projects and Campaign Hub organization.'}
                            </BodyText>

                            {canPurchase ? (
                                <Pressable
                                    style={[styles.primaryButton, (billingBusy || busy || loading || loadingBillingState) && styles.buttonDisabled]}
                                    onPress={handleUpgradePress}
                                    disabled={billingBusy || busy || loading || loadingBillingState}
                                >
                                    <Label style={styles.primaryButtonText}>
                                        {billingBusy
                                            ? 'Opening...'
                                            : billingProvider === 'revenuecat'
                                                ? `Subscribe on ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}`
                                                : 'Upgrade to Pro'}
                                    </Label>
                                </Pressable>
                            ) : null}

                            {canRestorePurchases ? (
                                <Pressable
                                    style={[styles.secondaryButton, (billingBusy || busy || loading || loadingBillingState) && styles.buttonDisabled]}
                                    onPress={handleRestorePurchasesPress}
                                    disabled={billingBusy || busy || loading || loadingBillingState}
                                >
                                    <Label style={styles.secondaryButtonText}>
                                        {billingBusy ? 'Working...' : 'Restore Purchases'}
                                    </Label>
                                </Pressable>
                            ) : null}
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
                        <Heading>
                            {billingProvider === 'revenuecat' && currentPackage?.priceString
                                ? currentPackage.priceString
                                : isNativePlanPreview
                                    ? 'Coming Soon on Mobile'
                                    : 'Unlimited'}
                        </Heading>
                        <BodyText>
                            {billingProvider === 'revenuecat'
                                ? `${currentPackage?.title ?? 'Native mobile subscription'} managed through ${Platform.OS === 'ios' ? 'the App Store' : 'Google Play'}.`
                                : isNativePlanPreview
                                ? 'Native subscriptions are not available in this build yet.'
                                : 'Built for active GMs, designers, and long-running projects.'}
                        </BodyText>

                        <View style={styles.featureList}>
                            <BodyText>• Unlimited saved projects</BodyText>
                            <BodyText>• Campaign Hub access</BodyText>
                            <BodyText>• Linked campaign workflows</BodyText>
                            <BodyText>
                                • {isNativePlanPreview ? 'Native subscription unlock is coming later' : 'Future premium features'}
                            </BodyText>
                        </View>
                    </Card>
                </View>

                <Card>
                    <Label>Current Pricing</Label>
                    <Heading>
                        {billingProvider === 'revenuecat' && currentPackage?.priceString
                            ? `${currentPackage.priceString} / month`
                            : isNativePlanPreview
                                ? 'Mobile Pro coming soon'
                                : '$4.99 / month'}
                    </Heading>
                    <BodyText>
                        {billingProvider === 'revenuecat'
                            ? `RevenueCat offering: ${currentPackage?.productIdentifier ?? 'No active product found yet.'}`
                            : isNativePlanPreview
                            ? 'The current mobile beta is free while native subscriptions are being wired up.'
                            : 'Monthly Pro unlocks unlimited saves and Campaign Hub organization.'}
                    </BodyText>
                    {nativeEntitlement?.latestExpirationDate ? (
                        <BodyText style={styles.subtleText}>
                            Latest store expiration on record: {formatPlanDate(nativeEntitlement.latestExpirationDate)}
                        </BodyText>
                    ) : null}
                </Card>

                <View style={styles.footerActions}>
                    <Pressable
                        style={styles.linkButton}
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                                return;
                            }

                            router.push('/');
                        }}
                    >
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
