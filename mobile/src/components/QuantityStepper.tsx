import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '../theme';

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
};

export function QuantityStepper({ value, onChange, min = 1 }: Props) {
  return (
    <View style={[styles.wrap, shadows.soft]}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        hitSlop={8}
        style={styles.side}
      >
        <Ionicons name="remove" size={18} color={colors.textSecondary} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        hitSlop={8}
        style={[styles.plus, shadows.soft]}
      >
        <Ionicons name="add" size={18} color={colors.primaryContrast} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
  },
  side: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  plus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
