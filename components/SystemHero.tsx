import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { BodyText, Heading, Label } from '@/components/AppText';
import { Colors, Spacing } from '@/constants/theme';
import { getSystemPresentation } from '@/lib/systemPresentation';
import type { GameSystemId } from '@/lib/gameSystems';

type SystemHeroProps = PropsWithChildren<{
  systemId: GameSystemId;
  eyebrow: string;
  title: string;
  body: string;
  chips?: string[];
}>;

export function SystemHero({
  systemId,
  eyebrow,
  title,
  body,
  chips = [],
  children,
}: SystemHeroProps) {
  const presentation = getSystemPresentation(systemId);
  const { palette } = presentation;

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: palette.heroSurface,
          borderColor: palette.heroBorder,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.glowLarge, { backgroundColor: palette.accentSoft }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glowSmall, { borderColor: palette.accent }]}
      />

      <View style={styles.content}>
        <Label style={[styles.eyebrow, { color: palette.accentText }]}>{eyebrow}</Label>
        <Heading style={styles.title}>{title}</Heading>
        <BodyText style={styles.body}>{body}</BodyText>

        {chips.length > 0 ? (
          <View style={styles.chipRow}>
            {chips.map((chip) => (
              <View
                key={chip}
                style={[
                  styles.chip,
                  {
                    backgroundColor: palette.chipSurface,
                    borderColor: palette.chipBorder,
                  },
                ]}
              >
                <Label style={styles.chipText}>{chip}</Label>
              </View>
            ))}
          </View>
        ) : null}

        {children ? <View style={styles.children}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  glowLarge: {
    position: 'absolute',
    right: -48,
    top: -36,
    width: 180,
    height: 180,
    borderRadius: 999,
  },
  glowSmall: {
    position: 'absolute',
    right: 28,
    top: 22,
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.45,
  },
  eyebrow: {
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.text,
    fontSize: 30,
    lineHeight: 36,
    maxWidth: 560,
  },
  body: {
    maxWidth: 620,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: Colors.text,
    fontSize: 13,
  },
  children: {
    gap: Spacing.sm,
  },
});
