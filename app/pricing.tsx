import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAppState } from '@/contexts/AppStateContext';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

function showMessage(title: string, message: string) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        return;
    }

    Alert.alert(title, message);
}

export default function PricingScreen() {
    const [busy, setBusy] = useState(false);
    const { loading, isPro, isSignedIn, userId, refreshAppState } = useAppState();


    function handleUpgradePress() {
        if (isPro) {
            showMessage('Pro already active', 'Your account already has Pro enabled.');
            return;
        }

        router.push('/checkout');
    }

    function handleRestorePress() {
        showMessage(
            'Restore not wired yet',
            'This button will later restore a prior Pro purchase or refresh account access.'
        );
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

            const { error } = await supabase.rpc('downgrade_to_free_and_trim_projects');

            if (error) {
                showMessage('Downgrade failed', error.message);
                return;
            }

            await refreshAppState();
            showMessage(
                'Pro disabled',
                'Dev Pro access has been removed. Campaigns, linked campaign projects, and extra standalone projects beyond the free limit were deleted.'
            );
        } finally {
            setBusy(false);
        }
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

                <Card>
                    <Label>Current Plan</Label>
                    {loading ? (
                        <View style={styles.row}>
                            <ActivityIndicator />
                            <BodyText>Loading plan...</BodyText>
                        </View>
                    ) : !isSignedIn ? (
                        <BodyText>Not signed in. Sign in to view and manage your plan.</BodyText>
                    ) : isPro ? (
                        <BodyText>Pro is active on this account.</BodyText>
                    ) : (
                        <BodyText>Free plan active. You can save up to 3 total projects.</BodyText>
                    )}
                </Card>

                <Card>
                    <Label>Manage Subscription</Label>
                    {!isSignedIn ? (
                        <BodyText>Sign in first to manage billing and account access.</BodyText>
                    ) : isPro ? (
                        <>
                            <BodyText>
                                You currently have Pro access. When real billing is wired, this section will let you
                                manage renewal, billing, and restoration.
                            </BodyText>

                            <Pressable
                                style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                                onPress={handleRestorePress}
                                disabled={busy}
                            >
                                <Label style={styles.secondaryButtonText}>Restore Access</Label>
                            </Pressable>

                            <Pressable
                                style={[styles.dangerButton, busy && styles.buttonDisabled]}
                                onPress={handleDisableProDev}
                                disabled={busy}
                            >
                                <Label style={styles.primaryButtonText}>
                                    {busy ? 'Working...' : 'Disable Pro (Dev Only)'}
                                </Label>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <BodyText>
                                Upgrade to Pro to unlock unlimited saved projects and future premium features.
                            </BodyText>

                            <Pressable style={styles.primaryButton} onPress={handleUpgradePress}>
                                <Label style={styles.primaryButtonText}>Upgrade to Pro</Label>
                            </Pressable>

                            <Pressable style={styles.secondaryButton} onPress={handleRestorePress}>
                                <Label style={styles.secondaryButtonText}>Restore Access</Label>
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
                            <BodyText>• Best for campaign building</BodyText>
                            <BodyText>• Future premium features</BodyText>
                            <BodyText>• Future export and advanced tools</BodyText>
                        </View>
                    </Card>
                </View>

                <Card>
                    <Label>Planned Pricing</Label>
                    <Heading>$4.99 / month</Heading>
                    <BodyText>
                        This is a placeholder price while billing is still being wired. You can adjust it later.
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