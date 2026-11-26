import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, typography } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  variant = 'solid',
  style,
}: Props) {
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : styles.solid,
        !isOutline && shadows.medium,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && { opacity: 0.92, transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.text : colors.primaryContrast} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={isOutline ? colors.text : colors.primaryContrast}
              style={styles.icon}
            />
          ) : null}
          <Text style={[styles.label, isOutline && styles.outlineLabel]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 24,
  },
  solid: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    ...typography.button,
    color: colors.primaryContrast,
    fontWeight: '700',
  },
  outlineLabel: {
    color: colors.text,
  },
  icon: {
    marginRight: 8,
  },
});
