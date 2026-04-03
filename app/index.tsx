import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

export default function LandingPage() {
    return (
        <Screen>
            <ScrollView contentContainerStyle={styles.content}>
                <Card>
                    <View style={styles.heroSection}>
                        <Label>Homebrew Helper</Label>
                        <Heading>Practical tools for building better tabletop campaigns</Heading>
                        <BodyText>
                            Homebrew Helper gives game masters a focused toolkit for planning
                            encounters, progression, quests, rewards, and campaign prep in one place.
                        </BodyText>
                        <BodyText style={styles.subtleText}>
                            Built for fast session prep, long-running campaigns, and organized worldbuilding.
                        </BodyText>

                        <View style={styles.heroActions}>
                            <Pressable
                                style={styles.primaryButton}
                                onPress={() => router.push('/(tabs)/account')}
                            >
                                <Label style={styles.primaryButtonText}>Get Started</Label>
                            </Pressable>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() => router.push('/pricing')}
                            >
                                <Label style={styles.secondaryButtonText}>View Pricing</Label>
                            </Pressable>
                        </View>
                    </View>
                </Card>

                <Card>
                    <Label>Everything you need to prep faster</Label>
                    <Heading>Focused tools for the parts of campaign building that take the most time</Heading>
                    <BodyText>
                        Use purpose-built planning tools instead of jumping between scattered notes,
                        spreadsheets, and half-finished documents.
                    </BodyText>

                    <View style={styles.grid}>
                        <View style={styles.featureCard}>
                            <Label>XP Planner</Label>
                            <BodyText>
                                Model progression pace, compare advancement styles, and estimate how long
                                a campaign takes to reach key milestones.
                            </BodyText>
                        </View>

                        <View style={styles.featureCard}>
                            <Label>Encounter Builder</Label>
                            <BodyText>
                                Balance enemy pressure, battlefield roles, terrain, and wave structure
                                to create fights that feel intentional.
                            </BodyText>
                        </View>

                        <View style={styles.featureCard}>
                            <Label>Reward Designer</Label>
                            <BodyText>
                                Generate more useful treasure by combining source, rarity, theme, and
                                practical reward guidance.
                            </BodyText>
                        </View>

                        <View style={styles.featureCard}>
                            <Label>Quest Builder</Label>
                            <BodyText>
                                Create faction-driven quest hooks, twists, resolutions, and consequences
                                with stronger story structure.
                            </BodyText>
                        </View>
                    </View>
                </Card>

                <Card>
                    <Label>Built for actual session prep</Label>
                    <Heading>Useful when you need answers fast</Heading>

                    <View style={styles.grid}>
                        <View style={styles.featureCard}>
                            <Label>Make decisions faster</Label>
                            <BodyText>
                                Get structured starting points instead of staring at a blank page.
                            </BodyText>
                        </View>

                        <View style={styles.featureCard}>
                            <Label>Save what works</Label>
                            <BodyText>
                                Keep your strongest encounters, quests, loot ideas, and progression plans
                                for reuse later.
                            </BodyText>
                        </View>

                        <View style={styles.featureCard}>
                            <Label>Stay organized</Label>
                            <BodyText>
                                Turn scattered prep into a workflow you can actually come back to between sessions.
                            </BodyText>
                        </View>
                    </View>
                </Card>

                <Card>
                    <Label>Upgrade when you need a real campaign workspace</Label>
                    <Heading>Free is for trying ideas. Pro is for running a campaign with structure.</Heading>
                    <BodyText>
                        Pro is designed for game masters who want to save more, organize more,
                        and connect their prep in one place.
                    </BodyText>

                    <View style={styles.grid}>
                        <View style={styles.featureCard}>
                            <Label>Unlimited saved projects</Label>
                            <BodyText>
                                Save as many planning tools and drafts as you need.
                            </BodyText>
                        </View>

                        <View style={styles.featureCard}>
                            <Label>Campaign Hub</Label>
                            <BodyText>
                                Organize linked encounters, loot, quests, and progression plans inside
                                a shared campaign workspace.
                            </BodyText>
                        </View>

                        <View style={styles.featureCard}>
                            <Label>Long-form prep support</Label>
                            <BodyText>
                                Keep campaign notes, objectives, and session planning connected over time.
                            </BodyText>
                        </View>
                    </View>
                </Card>

                <Card>
                    <Label>How it works</Label>
                    <Heading>A simple workflow for better prep</Heading>

                    <View style={styles.steps}>
                        <View style={styles.stepCard}>
                            <Label>1. Build</Label>
                            <BodyText>
                                Use the toolkit to create progression plans, encounters, rewards, and quests.
                            </BodyText>
                        </View>

                        <View style={styles.stepCard}>
                            <Label>2. Save</Label>
                            <BodyText>
                                Keep the ideas that work and return to them later.
                            </BodyText>
                        </View>

                        <View style={styles.stepCard}>
                            <Label>3. Organize</Label>
                            <BodyText>
                                Upgrade to Pro when you want to manage everything inside a campaign-level workspace.
                            </BodyText>
                        </View>
                    </View>
                </Card>

                <Card>
                    <Label>Simple pricing</Label>
                    <Heading>Start free. Upgrade when you need more room.</Heading>

                    <View style={styles.pricingGrid}>
                        <View style={styles.pricingCard}>
                            <Label>Free</Label>
                            <BodyText>Good for trying the toolkit and building a few core ideas.</BodyText>
                            <View style={styles.bulletList}>
                                <BodyText>• 3 saved projects total</BodyText>
                                <BodyText>• Access to all core tools</BodyText>
                                <BodyText>• Save, update, and duplicate projects</BodyText>
                            </View>
                        </View>

                        <View style={styles.pricingCard}>
                            <Label>Pro — $4.99/month</Label>
                            <BodyText>For active GMs and long-running campaigns.</BodyText>
                            <View style={styles.bulletList}>
                                <BodyText>• Unlimited saved projects</BodyText>
                                <BodyText>• Campaign Hub access</BodyText>
                                <BodyText>• Linked planning workflows</BodyText>
                                <BodyText>• Manage billing anytime</BodyText>
                            </View>
                        </View>
                    </View>

                    <BodyText style={styles.subtleText}>Cancel anytime.</BodyText>

                    <View style={styles.heroActions}>
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => router.push('/(tabs)/account')}
                        >
                            <Label style={styles.primaryButtonText}>Get Started</Label>
                        </Pressable>

                        <Pressable
                            style={styles.secondaryButton}
                            onPress={() => router.push('/pricing')}
                        >
                            <Label style={styles.secondaryButtonText}>View Pricing</Label>
                        </Pressable>
                    </View>
                </Card>

                <Card>
                    <Label>Support & Legal</Label>
                    <BodyText>Support: {SUPPORT_EMAIL}</BodyText>

                    <View style={styles.footerLinks}>
                        <Pressable onPress={() => router.push('/privacy')}>
                            <Label>Privacy Policy</Label>
                        </Pressable>

                        <Pressable onPress={() => router.push('/terms')}>
                            <Label>Terms of Service</Label>
                        </Pressable>
                    </View>
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
    heroSection: {
        gap: Spacing.sm,
    },
    heroActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: 'wrap',
        marginTop: Spacing.sm,
    },
    primaryButton: {
        backgroundColor: Colors.accent,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
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
    },
    secondaryButtonText: {
        color: Colors.text,
    },
    subtleText: {
        opacity: 0.75,
    },
    grid: {
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    featureCard: {
        backgroundColor: Colors.elevated,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    steps: {
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    stepCard: {
        backgroundColor: Colors.elevated,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    pricingGrid: {
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    pricingCard: {
        backgroundColor: Colors.elevated,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    bulletList: {
        gap: 6,
        marginTop: 4,
    },
    footerLinks: {
        flexDirection: 'row',
        gap: Spacing.md,
        flexWrap: 'wrap',
        marginTop: Spacing.sm,
    },
});
