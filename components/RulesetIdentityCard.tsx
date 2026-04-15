import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Colors, Spacing } from '@/constants/theme';
import type { GameSystemDefinition } from '@/lib/gameSystems';

type RulesetIdentityCardProps = {
  system: GameSystemDefinition;
  label?: string;
  showIdentity?: boolean;
  showAttribution?: boolean;
};

export function RulesetIdentityCard({
  system,
  label = 'Ruleset Identity',
  showIdentity = true,
  showAttribution = true,
}: RulesetIdentityCardProps) {
  const attribution = showAttribution ? system.attribution : undefined;
  const hasIdentity = showIdentity;
  const hasAttribution = Boolean(attribution);

  if (!hasIdentity && !hasAttribution) {
    return null;
  }

  return (
    <Card>
      {hasIdentity ? (
        <View style={styles.section}>
          <Label>{label}</Label>
          <Heading style={styles.title}>{system.modeIdentity.title}</Heading>
          <BodyText>{system.modeIdentity.body}</BodyText>
          <View style={styles.list}>
            {system.modeIdentity.highlights.map((entry) => (
              <BodyText key={entry}>- {entry}</BodyText>
            ))}
          </View>
        </View>
      ) : null}

      {hasIdentity && hasAttribution ? <View style={styles.divider} /> : null}

      {hasAttribution && attribution ? (
        <View style={styles.section}>
          <Label>{attribution.title}</Label>
          <BodyText>{attribution.body}</BodyText>
          <BodyText style={styles.scopeNote}>{attribution.scopeNote}</BodyText>
          <Pressable
            onPress={() => {
              void Linking.openURL(attribution.linkUrl);
            }}
            style={styles.linkButton}
          >
            <Label style={styles.linkButtonText}>{attribution.linkLabel}</Label>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  list: {
    gap: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  scopeNote: {
    opacity: 0.8,
  },
  linkButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  linkButtonText: {
    color: Colors.text,
  },
});
