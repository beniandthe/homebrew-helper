import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { GameSystemId } from '@/lib/gameSystems';
import { getSystemPresentation } from '@/lib/systemPresentation';

type SystemPanelTone = 'default' | 'muted' | 'accent';

type SystemPanelProps = PropsWithChildren<{
  systemId: GameSystemId;
  tone?: SystemPanelTone;
  style?: StyleProp<ViewStyle>;
}>;

export function SystemPanel({
  systemId,
  tone = 'default',
  style,
  children,
}: SystemPanelProps) {
  const presentation = getSystemPresentation(systemId);
  const { palette } = presentation;

  const backgroundColor =
    tone === 'accent'
      ? palette.panelAccent
      : tone === 'muted'
        ? palette.panelMuted
        : palette.panelSurface;

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor,
          borderColor: palette.heroBorder,
          shadowColor: palette.accent,
        },
        style,
      ]}
    >
      <View style={[styles.rule, { backgroundColor: palette.accent }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  rule: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: 999,
    marginBottom: Spacing.xs,
  },
});
