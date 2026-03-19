import { Pressable, StyleSheet, View } from 'react-native';

import { BodyText, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Colors, Spacing } from '@/constants/theme';

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

    return (
        <Card>
            <Label>{isPro ? 'Pro Plan' : 'Free Plan'}</Label>

            <BodyText>
                {isPro
                    ? 'Unlimited saves enabled.'
                    : `You have used ${savedProjectCount}/${maxFreeSaves} free saves.`}
            </BodyText>

            {showLockedMessage && isLocked ? (
                <View style={styles.lockedBlock}>
                    <Label>Free plan limit reached</Label>
                    <BodyText>
                        You have used all {maxFreeSaves} free saves. Upgrade to Pro to create additional
                        projects.
                    </BodyText>
                </View>
            ) : null}

            {!isPro ? (
                <Pressable style={styles.proButton} onPress={onUpgradePress}>
                    <Label style={styles.proButtonText}>
                        {isLocked ? 'Upgrade to Keep Saving' : 'Upgrade to Pro'}
                    </Label>
                </Pressable>
            ) : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    lockedBlock: {
        gap: Spacing.xs,
        marginTop: Spacing.sm,
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