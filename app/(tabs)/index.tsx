import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BodyText, Heading, Label } from '@/components/AppText';
import { GameSystemPicker } from '@/components/GameSystemPicker';
import { RulesetIdentityCard } from '@/components/RulesetIdentityCard';
import { Screen } from '@/components/Screen';
import { SystemHero } from '@/components/SystemHero';
import { SystemPanel } from '@/components/SystemPanel';
import { useAppState } from '@/contexts/AppStateContext';
import { useGameSystem } from '@/contexts/GameSystemContext';
import { Colors, Spacing } from '@/constants/theme';
import { getSystemPresentation } from '@/lib/systemPresentation';
import { getHomeUpgradeCopy, getPlanSummaryCopy } from '@/lib/subscriptionUi';

export default function HomeScreen() {
  const { isPro, savedProjectCount, loading } = useAppState();
  const { activeSystem, activeSystemId, setActiveSystemId } = useGameSystem();
  const presentation = getSystemPresentation(activeSystemId);

  const maxFreeSaves = 3;
  const homeUpgradeCopy = getHomeUpgradeCopy(maxFreeSaves);

  function goTo(
    path:
      | '/campaign'
      | '/xp'
      | '/encounters'
      | '/generator'
      | '/quest'
      | '/projects'
      | '/pricing'
      | '/privacy-policy'
      | '/terms-of-service',
  ) {
    router.push(path);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <SystemHero
          systemId={activeSystemId}
          eyebrow={presentation.posterLabel}
          title={activeSystem.home.heroTitle}
          body={activeSystem.home.heroSubtitle}
          chips={[activeSystem.home.badge, ...presentation.heroTags]}
        >
          <GameSystemPicker
            value={activeSystemId}
            onChange={setActiveSystemId}
            label="Game Style"
            helperText="Pick the game first, then build prep that sounds right for that table."
          />

          <View style={styles.heroActions}>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: presentation.palette.accent }]}
              onPress={() => goTo('/xp')}
            >
              <Label style={styles.primaryButtonText}>{activeSystem.home.primaryCta}</Label>
            </Pressable>

            <Pressable
              style={[
                styles.secondaryButton,
                { borderColor: presentation.palette.heroBorder, backgroundColor: presentation.palette.panelMuted },
              ]}
              onPress={() => goTo('/projects')}
            >
              <Label>Open Saved Prep</Label>
            </Pressable>
          </View>
        </SystemHero>

        <SystemPanel systemId={activeSystemId} tone="muted">
          <Label>Current Plan</Label>
          {loading ? (
            <BodyText>Checking your account status...</BodyText>
          ) : isPro ? (
            <BodyText>{getPlanSummaryCopy(savedProjectCount, maxFreeSaves, true)}</BodyText>
          ) : (
            <BodyText>{getPlanSummaryCopy(savedProjectCount, maxFreeSaves, false)}</BodyText>
          )}
        </SystemPanel>

        <RulesetIdentityCard system={activeSystem} />

        <View style={styles.sectionHeader}>
          <Heading style={styles.sectionTitle}>{activeSystem.home.sectionTitle}</Heading>
          <BodyText>{activeSystem.home.sectionSubtitle}</BodyText>
        </View>

        <View style={styles.grid}>
          <Pressable onPress={() => goTo('/campaign')}>
            <SystemPanel systemId={activeSystemId} tone="accent">
              <Label>{activeSystem.home.campaign.label}</Label>
              <Heading style={styles.cardTitle}>{activeSystem.home.campaign.title}</Heading>
              <BodyText>{activeSystem.home.campaign.body}</BodyText>
            </SystemPanel>
          </Pressable>

          <Pressable onPress={() => goTo('/xp')}>
            <SystemPanel systemId={activeSystemId}>
              <Label>{activeSystem.home.xp.label}</Label>
              <Heading style={styles.cardTitle}>{activeSystem.home.xp.title}</Heading>
              <BodyText>{activeSystem.home.xp.body}</BodyText>
            </SystemPanel>
          </Pressable>

          <Pressable onPress={() => goTo('/encounters')}>
            <SystemPanel systemId={activeSystemId}>
              <Label>{activeSystem.home.encounters.label}</Label>
              <Heading style={styles.cardTitle}>{activeSystem.home.encounters.title}</Heading>
              <BodyText>{activeSystem.home.encounters.body}</BodyText>
            </SystemPanel>
          </Pressable>

          <Pressable onPress={() => goTo('/generator')}>
            <SystemPanel systemId={activeSystemId}>
              <Label>{activeSystem.home.generator.label}</Label>
              <Heading style={styles.cardTitle}>{activeSystem.home.generator.title}</Heading>
              <BodyText>{activeSystem.home.generator.body}</BodyText>
            </SystemPanel>
          </Pressable>

          <Pressable onPress={() => goTo('/quest')}>
            <SystemPanel systemId={activeSystemId}>
              <Label>{activeSystem.home.quest.label}</Label>
              <Heading style={styles.cardTitle}>{activeSystem.home.quest.title}</Heading>
              <BodyText>{activeSystem.home.quest.body}</BodyText>
            </SystemPanel>
          </Pressable>
        </View>

        <Pressable onPress={() => goTo('/projects')}>
          <SystemPanel systemId={activeSystemId} tone="muted">
            <Label>{activeSystem.home.projects.label}</Label>
            <Heading style={styles.cardTitle}>{activeSystem.home.projects.title}</Heading>
            <BodyText>{activeSystem.home.projects.body}</BodyText>
          </SystemPanel>
        </Pressable>

        {!isPro ? (
          <Pressable onPress={() => goTo('/pricing')}>
            <View
              style={[
                styles.upgradeCard,
                {
                  backgroundColor: presentation.palette.panelAccent,
                  borderColor: presentation.palette.heroBorder,
                },
              ]}
            >
              <Label style={styles.upgradeLabel}>{homeUpgradeCopy.label}</Label>
              <Heading style={styles.upgradeTitle}>{homeUpgradeCopy.title}</Heading>
              <BodyText style={styles.upgradeText}>
                {homeUpgradeCopy.text}
              </BodyText>

              <View
                style={[
                  styles.upgradeButton,
                  { backgroundColor: presentation.palette.accent },
                ]}
              >
                <Label style={styles.upgradeButtonText}>{homeUpgradeCopy.buttonLabel}</Label>
              </View>
            </View>
          </Pressable>
        ) : (
          <SystemPanel systemId={activeSystemId} tone="accent">
            <Label>Pro Status</Label>
            <Heading style={styles.cardTitle}>{activeSystem.home.proTitle}</Heading>
            <BodyText>{activeSystem.home.proBody}</BodyText>
          </SystemPanel>
        )}

        <View style={styles.footer}>
          <Pressable onPress={() => goTo('/privacy-policy')}>
            <BodyText style={styles.footerLink}>Privacy Policy</BodyText>
          </Pressable>
          <Pressable onPress={() => goTo('/terms-of-service')}>
            <BodyText style={styles.footerLink}>Terms of Service</BodyText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: Colors.accent,
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
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  upgradeLabel: {
    color: Colors.text,
  },
  upgradeTitle: {
    color: Colors.text,
    fontSize: 26,
    lineHeight: 32,
  },
  upgradeText: {
    color: Colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  upgradeButton: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  upgradeButtonText: {
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  footerLink: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
