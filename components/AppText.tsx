import { PropsWithChildren } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { Colors } from '@/constants/theme';

export function Heading({ children, style, ...props }: PropsWithChildren<TextProps>) {
  return (
    <Text {...props} style={[styles.heading, style]}>
      {children}
    </Text>
  );
}

export function BodyText({ children, style, ...props }: PropsWithChildren<TextProps>) {
  return (
    <Text {...props} style={[styles.body, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style, ...props }: PropsWithChildren<TextProps>) {
  return (
    <Text {...props} style={[styles.label, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  body: {
    color: Colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
