import Ionicons from 'react-native-vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { router } from '@/navigation/router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../context/AppContext';
import { colors, shadows } from '../theme';
import { ScanGlyph } from './ScanGlyph';

const TABS: {
  name: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'cart', label: 'Cart', icon: 'bag-outline', activeIcon: 'bag' },
  { name: 'scan', label: 'Scan', icon: 'scan-outline', activeIcon: 'scan' },
  { name: 'ai', label: 'AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

type TabBarProps = BottomTabBarProps & {
  navigateToTab?: (routeKey: string) => void;
};

export function FloatingTabBar({ state, navigation, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { cartCount } = useApp();
  const scanScale = useSharedValue(1);
  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanScale.value }],
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.barShell, shadows.float]}>
        {Platform.OS === 'ios' ? (
          <BlurView blurType="light" blurAmount={20} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.barFill} />

        <View style={styles.row}>
          {TABS.map((tab) => {
            if (tab.name === 'scan') {
              return (
                <View key={tab.name} style={styles.scanSlot}>
                  <Pressable
                    onPressIn={() => {
                      scanScale.value = withSpring(0.92, { damping: 14 });
                    }}
                    onPressOut={() => {
                      scanScale.value = withSpring(1, { damping: 12 });
                    }}
                    onPress={() => router.push('/scan')}
                    hitSlop={8}
                    style={styles.scanPress}
                  >
                    <Animated.View style={[styles.scanBtn, shadows.medium, scanStyle]}>
                      <ScanGlyph size={22} color="#FFFFFF" />
                    </Animated.View>
                    <Text style={styles.scanLabel}>{tab.label}</Text>
                  </Pressable>
                </View>
              );
            }

            const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
            const focused = state.index === routeIndex;
            const onPress = () => {
              const route = state.routes[routeIndex];
              if (!route) return;
              if (navigateToTab) {
                navigateToTab(route.key);
                return;
              }
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable key={tab.name} onPress={onPress} style={styles.item}>
                <View style={[styles.iconWrap, focused && styles.iconActive]}>
                  <Ionicons
                    name={focused ? tab.activeIcon : tab.icon}
                    size={20}
                    color={focused ? colors.text : '#9A9A9E'}
                  />
                  {tab.name === 'cart' && cartCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  barShell: {
    width: '100%',
    maxWidth: 420,
    height: 78,
    borderRadius: 28,
    overflow: 'visible',
    justifyContent: 'center',
  },
  barFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 8,
    height: '100%',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingBottom: 2,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    transform: [{ translateY: -1 }],
  },
  label: {
    fontSize: 10,
    color: '#9A9A9E',
    fontWeight: '600',
  },
  labelActive: {
    color: colors.text,
  },
  scanSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  scanPress: {
    alignItems: 'center',
    marginTop: -18,
  },
  scanBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLabel: {
    marginTop: 4,
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
