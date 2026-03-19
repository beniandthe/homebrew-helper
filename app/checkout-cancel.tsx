import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';

export default function CheckoutCancelScreen() {
    return (
        <Screen>
            <Card>
                <Heading>Checkout Canceled</Heading>
                <BodyText>
                    No problem. You can continue using the free plan and upgrade later whenever you want.
                </BodyText>
            </Card>

            <Card>
                <Label>Free Plan</Label>
                <BodyText>• 3 saved projects total</BodyText>
                <BodyText>• All core tools still available</BodyText>

                <Pressable style={styles.primaryButton} onPress={() => router.push('/pricing')}>
                    <Label style={styles.primaryButtonText}>Back to Pricing</Label>
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/xp')}>
                    <Label style={styles.secondaryButtonText}>Back to Tools</Label>
                </Pressable>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
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