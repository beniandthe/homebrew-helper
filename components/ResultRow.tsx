import { StyleSheet, View } from 'react-native';
import { BodyText, Label } from '@/components/AppText';
import { Colors, Spacing } from '@/constants/theme';

export function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Label>{label}</Label>
      <BodyText style={styles.value}>{value}</BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 4,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  value: {
    color: Colors.text,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
