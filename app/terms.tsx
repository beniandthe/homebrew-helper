import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Spacing } from '@/constants/theme';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

export default function TermsPage() {
    return (
        <Screen>
            <ScrollView contentContainerStyle={styles.content}>
                <Card>
                    <Heading>Terms of Service</Heading>
                    <BodyText>Last updated: March 30, 2026</BodyText>
                </Card>

                <Card>
                    <BodyText>
                        These Terms of Service govern your use of Homebrew Helper. By creating an
                        account, accessing the app, or using any related services, you agree to
                        these Terms.
                    </BodyText>
                </Card>

                <Card>
                    <Label>1. Use of the Service</Label>
                    <BodyText>
                        Homebrew Helper is a digital tool designed to help users create, organize,
                        and manage tabletop RPG planning content, including campaigns, encounters,
                        quests, loot, and progression tools.
                    </BodyText>
                    <BodyText>
                        You may use the service only in compliance with these Terms and applicable law.
                    </BodyText>
                </Card>

                <Card>
                    <Label>2. Accounts</Label>
                    <BodyText>
                        You are responsible for maintaining the confidentiality of your account
                        credentials and for any activity that occurs under your account.
                    </BodyText>
                    <BodyText>
                        You agree to provide accurate information and to use your account only for
                        lawful purposes.
                    </BodyText>
                </Card>

                <Card>
                    <Label>3. Subscription and Billing</Label>
                    <BodyText>
                        Homebrew Helper offers both free and paid features. Paid subscription access,
                        including Pro features, is billed on a recurring monthly basis unless canceled.
                    </BodyText>
                    <BodyText>
                        Billing, payment processing, and subscription management are handled by Stripe.
                        By purchasing a subscription, you also agree to Stripe’s applicable terms and policies.
                    </BodyText>
                </Card>

                <Card>
                    <Label>4. Cancellation and Plan Changes</Label>
                    <BodyText>
                        You may cancel your paid subscription through the billing management tools
                        provided in the app, where available.
                    </BodyText>
                    <BodyText>
                        If you cancel, your paid access may remain active until the end of your
                        current billing period, depending on the subscription state and billing rules.
                    </BodyText>
                    <BodyText>
                        After paid access ends, certain Pro-only features may become unavailable,
                        and some saved content may be limited or removed according to the product’s
                        plan rules.
                    </BodyText>
                </Card>

                <Card>
                    <Label>5. Acceptable Use</Label>
                    <View style={styles.list}>
                        <BodyText>• Use the service only for lawful purposes</BodyText>
                        <BodyText>• Do not attempt to access accounts, data, or systems that do not belong to you</BodyText>
                        <BodyText>• Do not interfere with or disrupt the normal operation of the service</BodyText>
                        <BodyText>• Do not attempt to reverse engineer, exploit, or misuse the platform</BodyText>
                    </View>
                </Card>

                <Card>
                    <Label>6. User Content</Label>
                    <BodyText>
                        You retain ownership of the content you create in Homebrew Helper, including
                        campaign notes, saved projects, and related planning material.
                    </BodyText>
                    <BodyText>
                        You grant Homebrew Helper the limited rights necessary to store, process,
                        and display that content in order to provide the service.
                    </BodyText>
                </Card>

                <Card>
                    <Label>7. Availability and Changes</Label>
                    <BodyText>
                        We may update, change, suspend, or improve the service at any time. We do
                        not guarantee that the service will always be available, uninterrupted, or
                        error-free.
                    </BodyText>
                </Card>

                <Card>
                    <Label>8. Termination</Label>
                    <BodyText>
                        We may suspend or terminate access to the service if you violate these Terms
                        or use the service in a way that harms the platform or other users.
                    </BodyText>
                </Card>

                <Card>
                    <Label>9. Disclaimer</Label>
                    <BodyText>
                        Homebrew Helper is provided on an “as is” and “as available” basis, without
                        warranties of any kind, to the fullest extent permitted by law.
                    </BodyText>
                </Card>

                <Card>
                    <Label>10. Limitation of Liability</Label>
                    <BodyText>
                        To the fullest extent permitted by law, Homebrew Helper will not be liable
                        for indirect, incidental, special, consequential, or exemplary damages arising
                        from your use of the service.
                    </BodyText>
                </Card>

                <Card>
                    <Label>11. Changes to These Terms</Label>
                    <BodyText>
                        We may update these Terms from time to time. If we make material changes,
                        we will update the date at the top of this page.
                    </BodyText>
                </Card>

                <Card>
                    <Label>12. Contact</Label>
                    <BodyText>{SUPPORT_EMAIL}</BodyText>
                </Card>

                <Card>
                    <Pressable onPress={() => router.push('/')}>
                        <Label>Back to Home</Label>
                    </Pressable>
                </Card>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: {
        gap: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    list: {
        gap: 6,
        marginTop: Spacing.sm,
    },
});
