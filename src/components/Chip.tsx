import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '../theme';

type Props = {
  label: string;
  backgroundColor: string;
  textColor: string;
};

export function Chip({ label, backgroundColor, textColor }: Props) {
  return (
    <View style={[styles.chip, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
