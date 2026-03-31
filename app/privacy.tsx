import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Spacing } from '@/constants/theme';

export default function PrivacyPage() {
    return (
        <Screen>
            <ScrollView contentContainerStyle={styles.content}>
                <Card>
                    <Heading>Privacy Policy</Heading>
                    <BodyText>Last updated: March 30, 2026</BodyText>
                </Card>

                <Card>
                    <BodyText>
                        Homebrew Helper respects your privacy. This Privacy Policy explains what
                        information we collect, how we use it, and how we protect it when you use
                        our app and related services.
                    </BodyText>
                </Card>

                <Card>
                    <Label>1. Information We Collect</Label>
                    <BodyText>When you use Homebrew Helper, we may collect the following information:</BodyText>
                    <View style={styles.list}>
                        <BodyText>• Account information, such as your email address and login credentials</BodyText>
                        <BodyText>• Content you create in the app, including saved projects, campaign notes, and related planning data</BodyText>
                        <BodyText>• Billing and subscription status information connected to your account</BodyText>
                        <BodyText>• Basic technical information needed to operate the service securely and reliably</BodyText>
                    </View>
                </Card>

                <Card>
                    <Label>2. How We Use Information</Label>
                    <View style={styles.list}>
                        <BodyText>• Create and manage your account</BodyText>
                        <BodyText>• Save and display your projects and campaign data</BodyText>
                        <BodyText>• Provide subscription features such as Pro access</BodyText>
                        <BodyText>• Process billing status and subscription access</BodyText>
                        <BodyText>• Respond to support requests</BodyText>
                        <BodyText>• Maintain, secure, and improve the service</BodyText>
                    </View>
                </Card>

                <Card>
                    <Label>3. Payments and Billing</Label>
                    <BodyText>
                        Payments and subscription management are handled by Stripe. We do not store
                        your full payment card details on our own servers.
                    </BodyText>
                    <BodyText>
                        When you purchase or manage a subscription, Stripe may collect and process
                        payment information in accordance with its own privacy policy and terms.
                    </BodyText>
                </Card>

                <Card>
                    <Label>4. Data Storage</Label>
                    <BodyText>
                        Account and app data are stored using third-party infrastructure and database
                        services that help us operate the app.
                    </BodyText>
                    <BodyText>
                        We take reasonable steps to protect your information, but no method of
                        transmission or storage is completely secure.
                    </BodyText>
                </Card>

                <Card>
                    <Label>5. How We Share Information</Label>
                    <BodyText>We do not sell your personal information.</BodyText>
                    <BodyText>We only share information with service providers as needed to operate the app, such as:</BodyText>
                    <View style={styles.list}>
                        <BodyText>• Authentication and database providers</BodyText>
                        <BodyText>• Payment processors</BodyText>
                        <BodyText>• Hosting and infrastructure providers</BodyText>
                    </View>
                </Card>

                <Card>
                    <Label>6. Data Retention</Label>
                    <BodyText>
                        We keep account and project data for as long as needed to operate the service,
                        comply with legal obligations, resolve disputes, and enforce our agreements.
                    </BodyText>
                    <BodyText>
                        If your subscription ends, some data may be removed or limited according to
                        the app’s plan rules and product behavior.
                    </BodyText>
                </Card>

                <Card>
                    <Label>7. Your Choices</Label>
                    <BodyText>
                        You may contact us if you have questions about your account or would like help
                        related to your data.
                    </BodyText>
                    <BodyText>
                        You may also manage or cancel your subscription through the billing tools
                        provided in the app, where available.
                    </BodyText>
                </Card>

                <Card>
                    <Label>8. Children’s Privacy</Label>
                    <BodyText>
                        Homebrew Helper is not intended for children under 13, and we do not knowingly
                        collect personal information from children under 13.
                    </BodyText>
                </Card>

                <Card>
                    <Label>9. Changes to This Policy</Label>
                    <BodyText>
                        We may update this Privacy Policy from time to time. If we make material changes,
                        we will update the date at the top of this page.
                    </BodyText>
                </Card>

                <Card>
                    <Label>10. Contact</Label>
                    <BodyText>homebrewhelper@gmail.com</BodyText>
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