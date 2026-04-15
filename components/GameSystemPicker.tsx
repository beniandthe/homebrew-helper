import { Pressable, StyleSheet, View } from 'react-native';

import { BodyText, Label } from '@/components/AppText';
import { Colors, Spacing } from '@/constants/theme';
import { GAME_SYSTEM_OPTIONS, type GameSystemId } from '@/lib/gameSystems';
import { getSystemPresentation } from '@/lib/systemPresentation';

type GameSystemPickerProps = {
  value: GameSystemId;
  onChange: (value: GameSystemId) => void;
  label?: string;
  helperText?: string;
};

export function GameSystemPicker({ value, onChange, label, helperText }: GameSystemPickerProps) {
  const activePresentation = getSystemPresentation(value);

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: activePresentation.palette.panelMuted,
          borderColor: activePresentation.palette.heroBorder,
        },
      ]}
    >
      {label ? <Label>{label}</Label> : null}
      {helperText ? <BodyText>{helperText}</BodyText> : null}

      <View style={styles.row}>
        {GAME_SYSTEM_OPTIONS.map((option) => {
          const selected = option.id === value;
          const optionPresentation = getSystemPresentation(option.id);

          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[
                styles.button,
                {
                  borderColor: optionPresentation.palette.heroBorder,
                },
                selected && {
                  backgroundColor: optionPresentation.palette.accent,
                  borderColor: optionPresentation.palette.accent,
                },
              ]}
            >
              <Label
                style={[
                  {
                    color: selected ? '#fff' : Colors.text,
                  },
                ]}
              >
                {option.label}
              </Label>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.elevated,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
