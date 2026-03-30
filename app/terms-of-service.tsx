import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BodyText, Heading, Label } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';

export default function TermsOfServiceScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.container}>
          <Heading>Terms of Service</Heading>
          <BodyText>
            <Label>Last updated:</Label> March 30, 2026
          </BodyText>

          <BodyText>
            These Terms of Service govern your use of Homebrew Helper. By creating an account, accessing
            the app, or using any related services, you agree to these Terms.
          </BodyText>

          <Heading style={styles.sectionTitle}>1. Use of the Service</Heading>
          <BodyText>
            Homebrew Helper is a digital tool designed to help users create, organize, and manage tabletop
            RPG planning content, including campaigns, encounters, quests, loot, and progression tools.
          </BodyText>
          <BodyText>
            You may use the service only in compliance with these Terms and applicable law.
          </BodyText>

          <Heading style={styles.sectionTitle}>2. Accounts</Heading>
          <BodyText>
            You are responsible for maintaining the confidentiality of your account credentials and for any
            activity that occurs under your account.
          </BodyText>
          <BodyText>
            You agree to provide accurate information and to use your account only for lawful purposes.
          </BodyText>

          <Heading style={styles.sectionTitle}>3. Subscription and Billing</Heading>
          <BodyText>
            Homebrew Helper offers both free and paid features. Paid subscription access, including Pro
            features, is billed on a recurring monthly basis unless canceled.
          </BodyText>
          <BodyText>
            Billing, payment processing, and subscription management are handled by Stripe. By purchasing a
            subscription, you also agree to Stripe&apos;s applicable terms and policies.
          </BodyText>

          <Heading style={styles.sectionTitle}>4. Cancellation and Plan Changes</Heading>
          <BodyText>
            You may cancel your paid subscription through the billing management tools provided in the app,
            where available.
          </BodyText>
          <BodyText>
            If you cancel, your paid access may remain active until the end of your current billing period,
            depending on the subscription state and billing rules.
          </BodyText>
          <BodyText>
            After paid access ends, certain Pro-only features may become unavailable, and some saved content
            may be limited or removed according to the product&apos;s plan rules.
          </BodyText>

          <Heading style={styles.sectionTitle}>5. Acceptable Use</Heading>
          <BodyText>You agree not to:</BodyText>
          <BodyText>{'• '}Use the service for unlawful, harmful, or abusive purposes</BodyText>
          <BodyText>{'• '}Attempt to access accounts, data, or systems that do not belong to you</BodyText>
          <BodyText>{'• '}Interfere with or disrupt the normal operation of the service</BodyText>
          <BodyText>{'• '}Attempt to reverse engineer, exploit, or misuse the platform</BodyText>

          <Heading style={styles.sectionTitle}>6. User Content</Heading>
          <BodyText>
            You retain ownership of the content you create in Homebrew Helper, including campaign notes,
            saved projects, and related planning material.
          </BodyText>
          <BodyText>
            You grant Homebrew Helper the limited rights necessary to store, process, and display that
            content in order to provide the service.
          </BodyText>

          <Heading style={styles.sectionTitle}>7. Availability and Changes</Heading>
          <BodyText>
            We may update, change, suspend, or improve the service at any time. We do not guarantee that the
            service will always be available, uninterrupted, or error-free.
          </BodyText>

          <Heading style={styles.sectionTitle}>8. Termination</Heading>
          <BodyText>
            We may suspend or terminate access to the service if you violate these Terms or use the service
            in a way that harms the platform or other users.
          </BodyText>

          <Heading style={styles.sectionTitle}>9. Disclaimer</Heading>
          <BodyText>
            Homebrew Helper is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis, without warranties of any
            kind, to the fullest extent permitted by law.
          </BodyText>

          <Heading style={styles.sectionTitle}>10. Limitation of Liability</Heading>
          <BodyText>
            To the fullest extent permitted by law, Homebrew Helper will not be liable for indirect,
            incidental, special, consequential, or exemplary damages arising from your use of the service.
          </BodyText>

          <Heading style={styles.sectionTitle}>11. Changes to These Terms</Heading>
          <BodyText>
            We may update these Terms from time to time. If we make material changes, we will update the
            date at the top of this page.
          </BodyText>

          <Heading style={styles.sectionTitle}>12. Contact</Heading>
          <BodyText>If you have questions about these Terms, you can contact:</BodyText>
          <BodyText>homebrewhelper@gmail.com</BodyText>

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
