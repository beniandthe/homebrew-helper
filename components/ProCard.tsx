import { Pressable, StyleSheet, View } from 'react-native';

import { BodyText, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Spacing } from '@/constants/theme';
import { getFreeLimitUpsell, getPlanActionLabel, getPlanSummaryCopy, isNativePlanPreview } from '@/lib/subscriptionUi';

type ProCardProps = {
    isPro: boolean;
    savedProjectCount: number;
    maxFreeSaves?: number;
    onUpgradePress: () => void;
    showLockedMessage?: boolean;
};

export function ProCard({
    isPro,
    savedProjectCount,
    maxFreeSaves = 3,
    onUpgradePress,
    showLockedMessage = false,
}: ProCardProps) {
    const isLocked = !isPro && savedProjectCount >= maxFreeSaves;
    const freeLimitUpsell = getFreeLimitUpsell(maxFreeSaves);

    return (
        <Card>
            <Label>{isPro ? 'Pro Plan' : 'Free Plan'}</Label>

            <BodyText>
                {getPlanSummaryCopy(savedProjectCount, maxFreeSaves, isPro)}
            </BodyText>

            {showLockedMessage && isLocked ? (
                <View style={styles.lockedBlock}>
                    <Label>Free plan limit reached</Label>
                    <BodyText>
                        {freeLimitUpsell.message}
                    </BodyText>
                </View>
            ) : null}

            {!isPro ? (
                <>
                    {isNativePlanPreview ? (
                        <BodyText style={styles.helperText}>
                            Mobile beta currently includes the free plan. Native Pro subscriptions and
                            Campaign Hub are coming in a later release.
                        </BodyText>
                    ) : null}

                    <Pressable style={styles.proButton} onPress={onUpgradePress}>
                        <Label style={styles.proButtonText}>
                            {isLocked && !isNativePlanPreview ? 'Upgrade to Keep Saving' : getPlanActionLabel()}
                        </Label>
                    </Pressable>
                </>
            ) : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    lockedBlock: {
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    helperText: {
        marginTop: Spacing.sm,
        opacity: 0.8,
    },
    proButton: {
        backgroundColor: '#6d28d9',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.sm,
    },
    proButtonText: {
        color: '#fff',
    },
});
