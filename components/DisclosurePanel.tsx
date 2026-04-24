import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BodyText, Label } from '@/components/AppText';
import { Spacing } from '@/constants/theme';
import type { GameSystemId } from '@/lib/gameSystems';
import { getSystemPresentation } from '@/lib/systemPresentation';
import { SystemPanel } from '@/components/SystemPanel';

type DisclosurePanelTone = 'default' | 'muted' | 'accent';

type DisclosurePanelProps = PropsWithChildren<{
  systemId: GameSystemId;
  title: string;
  summary?: string;
  tone?: DisclosurePanelTone;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;

export function DisclosurePanel({
  systemId,
  title,
  summary,
  tone = 'default',
  defaultOpen = false,
  open,
  onOpenChange,
  children,
}: DisclosurePanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const presentation = useMemo(() => getSystemPresentation(systemId), [systemId]);
  const expanded = typeof open === 'boolean' ? open : internalOpen;

  function handleToggle() {
    const nextValue = !expanded;

    if (typeof open !== 'boolean') {
      setInternalOpen(nextValue);
    }

    onOpenChange?.(nextValue);
  }

  return (
    <SystemPanel systemId={systemId} tone={tone}>
      <Pressable onPress={handleToggle} style={styles.trigger}>
        <View style={styles.copy}>
          <Label>{title}</Label>
          {summary ? (
            <BodyText numberOfLines={expanded ? undefined : 2} style={styles.summary}>
              {summary}
            </BodyText>
          ) : null}
        </View>

        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: presentation.palette.chipSurface,
              borderColor: presentation.palette.chipBorder,
            },
          ]}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={presentation.palette.accentText}
          />
        </View>
      </Pressable>

      {expanded ? <View style={styles.content}>{children}</View> : null}
    </SystemPanel>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  summary: {
    maxWidth: 640,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
});
