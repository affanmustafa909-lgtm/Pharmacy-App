import { router } from '@/navigation/router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme';
import { CircleButton } from './CircleButton';

type Props = {
  title: string;
  rightLabel?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  showBack?: boolean;
};

export function ScreenHeader({
  title,
  rightLabel,
  onBack,
  right,
  showBack = true,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.row}>
        {showBack ? (
          <CircleButton
            icon="chevron-back"
            onPress={onBack ?? (() => router.back())}
          />
        ) : (
          <View style={styles.spacer} />
        )}
        <Text style={styles.title}>{title}</Text>
        {right ? right : rightLabel ? (
          <Text style={styles.rightLabel}>{rightLabel}</Text>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: {
    ...typography.brand,
    fontSize: 18,
  },
  rightLabel: {
    ...typography.caption,
    width: 64,
    textAlign: 'right',
  },
  spacer: {
    width: 44,
  },
});
