import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BodyText, Heading, Label } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

export default function PrivacyPolicyScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.container}>
          <Heading>Privacy Policy</Heading>
          <BodyText>
            <Label>Last updated:</Label> March 30, 2026
          </BodyText>

          <BodyText>
            Homebrew Helper respects your privacy. This Privacy Policy explains what information we collect,
            how we use it, and how we protect it when you use our app and related services.
          </BodyText>

          <Heading style={styles.sectionTitle}>1. Information We Collect</Heading>
          <BodyText>When you use Homebrew Helper, we may collect the following information:</BodyText>
          <BodyText>{'• '}Account information, such as your email address and login credentials</BodyText>
          <BodyText>
            {'• '}Content you create in the app, including saved projects, campaign notes, and related
            planning data
          </BodyText>
          <BodyText>{'• '}Billing and subscription status information connected to your account</BodyText>
          <BodyText>{'• '}Basic technical information needed to operate the service securely and reliably</BodyText>

          <Heading style={styles.sectionTitle}>2. How We Use Information</Heading>
          <BodyText>We use your information to:</BodyText>
          <BodyText>{'• '}Create and manage your account</BodyText>
          <BodyText>{'• '}Save and display your projects and campaign data</BodyText>
          <BodyText>{'• '}Provide subscription features such as Pro access</BodyText>
          <BodyText>{'• '}Process billing status and subscription access</BodyText>
          <BodyText>{'• '}Respond to support requests</BodyText>
          <BodyText>{'• '}Maintain, secure, and improve the service</BodyText>

          <Heading style={styles.sectionTitle}>3. Payments and Billing</Heading>
          <BodyText>
            Payments and subscription management are handled by Stripe. We do not store your full payment card
            details on our own servers.
          </BodyText>
          <BodyText>
            When you purchase or manage a subscription, Stripe may collect and process payment information in
            accordance with its own privacy policy and terms.
          </BodyText>

          <Heading style={styles.sectionTitle}>4. Data Storage</Heading>
          <BodyText>
            Account and app data are stored using third-party infrastructure and database services that help us
            operate the app.
          </BodyText>
          <BodyText>
            We take reasonable steps to protect your information, but no method of transmission or storage is
            completely secure.
          </BodyText>

          <Heading style={styles.sectionTitle}>5. How We Share Information</Heading>
          <BodyText>We do not sell your personal information.</BodyText>
          <BodyText>
            We only share information with service providers as needed to operate the app, such as:
          </BodyText>
          <BodyText>{'• '}Authentication and database providers</BodyText>
          <BodyText>{'• '}Payment processors</BodyText>
          <BodyText>{'• '}Hosting and infrastructure providers</BodyText>

          <Heading style={styles.sectionTitle}>6. Data Retention</Heading>
          <BodyText>
            We keep account and project data for as long as needed to operate the service, comply with legal
            obligations, resolve disputes, and enforce our agreements.
          </BodyText>
          <BodyText>
            If your subscription ends, some data may be removed or limited according to the app’s plan rules and
            product behavior.
          </BodyText>

          <Heading style={styles.sectionTitle}>7. Your Choices</Heading>
          <BodyText>
            You may contact us if you have questions about your account or would like help related to your data.
          </BodyText>
          <BodyText>
            You may also manage or cancel your subscription through the billing tools provided in the app, where
            available.
          </BodyText>

          <Heading style={styles.sectionTitle}>8. Children’s Privacy</Heading>
          <BodyText>
            Homebrew Helper is not intended for children under 13, and we do not knowingly collect personal
            information from children under 13.
          </BodyText>

          <Heading style={styles.sectionTitle}>9. Changes to This Policy</Heading>
          <BodyText>
            We may update this Privacy Policy from time to time. If we make material changes, we will update the
            date at the top of this page.
          </BodyText>

          <Heading style={styles.sectionTitle}>10. Contact</Heading>
          <BodyText>If you have any questions about this Privacy Policy, you can contact us at:</BodyText>
          <BodyText>{SUPPORT_EMAIL}</BodyText>

          <Pressable style={styles.backLink} onPress={() => router.push('/')}>
            <Label style={styles.backLinkText}>Back to Home</Label>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.xl,
  },
  container: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: 12,
  },
  backLink: {
    marginTop: 16,
    alignSelf: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.text,
    paddingBottom: 2,
  },
  backLinkText: {
    color: Colors.text,
  },
});
