import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, shadows } from '../theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  backgroundColor?: string;
  iconColor?: string;
  badgeCount?: number;
  showDot?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function CircleButton({
  icon,
  onPress,
  size = 44,
  iconSize = 20,
  backgroundColor = colors.surface,
  iconColor = colors.text,
  badgeCount,
  showDot,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        shadows.soft,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
      hitSlop={8}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      {showDot ? <View style={styles.redDot} /> : null}
      {badgeCount != null && badgeCount > 0 ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  redDot: {
    position: 'absolute',
    top: 11,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  countText: {
    color: colors.primaryContrast,
    fontSize: 10,
    fontWeight: '700',
  },
});
