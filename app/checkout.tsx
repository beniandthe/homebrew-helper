import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';

function showMessage(title: string, message: string) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        return;
    }

    Alert.alert(title, message);
}

export default function CheckoutScreen() {
    function handleStartCheckout() {
        if (Platform.OS === 'web') {
            router.push('/checkout-success');
            return;
        }

        showMessage(
            'Mobile checkout placeholder',
            'This will later connect to Apple In-App Purchase.'
        );
    }

    return (
        <Screen>
            <Card>
                <Heading>Checkout</Heading>
                <BodyText>
                    This screen is the handoff point for real payment later. On web, this will launch Stripe
                    Checkout. On iPhone, this will trigger Apple In-App Purchase.
                </BodyText>
            </Card>

            <Card>
                <Label>Pro Plan</Label>
                <Heading>$4.99 / month</Heading>
                <BodyText>Unlimited saved projects and future premium features.</BodyText>

                <View style={styles.featureList}>
                    <BodyText>• Unlimited saves</BodyText>
                    <BodyText>• Full toolkit access</BodyText>
                    <BodyText>• Future exports and advanced tools</BodyText>
                </View>

                <Pressable style={styles.primaryButton} onPress={handleStartCheckout}>
                    <Label style={styles.primaryButtonText}>
                        {Platform.OS === 'web' ? 'Continue to Checkout' : 'Continue to App Store Purchase'}
                    </Label>
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={() => router.push('/checkout-cancel')}>
                    <Label style={styles.secondaryButtonText}>Cancel</Label>
                </Pressable>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
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
});