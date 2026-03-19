import { Pressable, StyleSheet, View } from 'react-native';
import { BodyText } from '@/components/AppText';
import { Colors, Spacing } from '@/constants/theme';

interface SegmentedControlProps<T extends string> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.button, selected && styles.selectedButton]}
          >
            <BodyText style={[styles.text, selected && styles.selectedText]}>{option}</BodyText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
  },
  selectedButton: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  text: {
    color: Colors.text,
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
