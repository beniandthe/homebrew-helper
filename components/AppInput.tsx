import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export function AppInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Colors.mutedText}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
    borderRadius: 14,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
});
