import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAppState } from '@/contexts/AppStateContext';
import { Colors, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { isPro, savedProjectCount, loading } = useAppState();

  const maxFreeSaves = 3;

  function goTo(path: '/campaign' | '/xp' | '/encounters' | '/generator' | '/quest' | '/projects' | '/pricing') {
    router.push(path);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Label style={styles.heroBadgeText}>RPG Toolkit</Label>
          </View>

          <Heading style={styles.heroTitle}>Forge campaigns, encounters, and legends.</Heading>

          <BodyText style={styles.heroSubtitle}>
            A fantasy toolkit for game masters and RPG designers. Shape progression, balance battles,
            generate treasure, and spin quest hooks worthy of tavern songs.
          </BodyText>

          <View style={styles.heroActions}>
            <Pressable style={styles.primaryButton} onPress={() => goTo('/xp')}>
              <Label style={styles.primaryButtonText}>Begin Crafting</Label>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => goTo('/projects')}>
              <Label>Open My Projects</Label>
            </Pressable>
          </View>
        </View>

        <Card>
          <Label>Current Plan</Label>
          {loading ? (
            <BodyText>Checking your account status...</BodyText>
          ) : isPro ? (
            <BodyText>Pro plan active. Unlimited saves are available to your account.</BodyText>
          ) : (
            <BodyText>
              Free plan active. You have used {savedProjectCount}/{maxFreeSaves} saved projects.
            </BodyText>
          )}
        </Card>

        <View style={styles.sectionHeader}>
          <Heading style={styles.sectionTitle}>Toolkit Chambers</Heading>
          <BodyText>Choose a tool and continue building your world.</BodyText>
        </View>

        <View style={styles.grid}>
          <Pressable onPress={() => goTo('/campaign')}>
            <Card>
              <Label>Campaign</Label>
              <Heading style={styles.cardTitle}>Campaign Hub</Heading>
              <BodyText>
                Organize campaign identity, party focus, objectives, and session notes in one place.
              </BodyText>
            </Card>
          </Pressable>

          <Pressable onPress={() => goTo('/xp')}>
            <Card>
              <Label>XP Calculator</Label>
              <Heading style={styles.cardTitle}>Leveling Forge</Heading>
              <BodyText>
                Shape character progression and tune your experience curve for long campaigns.
              </BodyText>
            </Card>
          </Pressable>

          <Pressable onPress={() => goTo('/encounters')}>
            <Card>
              <Label>Encounter</Label>
              <Heading style={styles.cardTitle}>Battle Planner</Heading>
              <BodyText>
                Weigh danger, pressure, and boss-tier threats before the party enters combat.
              </BodyText>
            </Card>
          </Pressable>

          <Pressable onPress={() => goTo('/generator')}>
            <Card>
              <Label>Loot</Label>
              <Heading style={styles.cardTitle}>Treasure Vault</Heading>
              <BodyText>
                Generate rewards, valuables, and item ideas fit for dungeons and fallen kings.
              </BodyText>
            </Card>
          </Pressable>

          <Pressable onPress={() => goTo('/quest')}>
            <Card>
              <Label>Quest</Label>
              <Heading style={styles.cardTitle}>Hook Generator</Heading>
              <BodyText>
                Spin faction intrigue, heroic objectives, and story complications in seconds.
              </BodyText>
            </Card>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Heading style={styles.sectionTitle}>Campaign Management</Heading>
          <BodyText>Keep your creations organized as your world grows.</BodyText>
        </View>

        <Pressable onPress={() => goTo('/projects')}>
          <Card>
            <Label>My Projects</Label>
            <Heading style={styles.cardTitle}>Archive of Scrolls</Heading>
            <BodyText>
              Open saved builds, rename them, duplicate them, and return to unfinished ideas.
            </BodyText>
          </Card>
        </Pressable>

        {!isPro ? (
          <Pressable onPress={() => goTo('/pricing')}>
            <View style={styles.upgradeCard}>
              <Label style={styles.upgradeLabel}>Upgrade to Pro</Label>
              <Heading style={styles.upgradeTitle}>Unlock the full guild.</Heading>
              <BodyText style={styles.upgradeText}>
                Remove the 3-project limit and keep unlimited campaigns, encounters, treasure sets,
                and quest concepts.
              </BodyText>

              <View style={styles.upgradeButton}>
                <Label style={styles.upgradeButtonText}>View Plans</Label>
              </View>
            </View>
          </Pressable>
        ) : (
          <Card>
            <Label>Pro Status</Label>
            <Heading style={styles.cardTitle}>Guildmaster Access</Heading>
            <BodyText>
              Your account has full access. Continue building without save limits.
            </BodyText>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  hero: {
    backgroundColor: Colors.elevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6d28d9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: '#fff',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: '#6d28d9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: Colors.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    gap: 4,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  grid: {
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 26,
    marginTop: 2,
    marginBottom: 4,
  },
  upgradeCard: {
    backgroundColor: '#6d28d9',
    borderRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  upgradeLabel: {
    color: '#fff',
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 32,
  },
  upgradeText: {
    color: '#f3e8ff',
    fontSize: 15,
    lineHeight: 22,
  },
  upgradeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  upgradeButtonText: {
    color: '#6d28d9',
  },
});
