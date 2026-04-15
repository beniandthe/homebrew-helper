import { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useGameSystem } from '@/contexts/GameSystemContext';
import { getSystemPresentation } from '@/lib/systemPresentation';

export function Screen({ children }: PropsWithChildren) {
  const { activeSystemId } = useGameSystem();
  const palette = getSystemPresentation(activeSystemId).palette;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.pageTint }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  inner: {
    gap: Spacing.md,
  },
});
