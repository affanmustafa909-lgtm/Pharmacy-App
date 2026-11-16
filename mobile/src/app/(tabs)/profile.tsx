import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { colors, radii, shadows, spacing } from '@/theme';

const MENU = [
  { label: 'My orders', icon: 'receipt-outline' as const, href: '/orders' },
  { label: 'Prescriptions', icon: 'document-text-outline' as const, href: '/prescriptions' },
  { label: 'Notifications', icon: 'notifications-outline' as const, href: '/notifications' },
  { label: 'Addresses', icon: 'home-outline' as const, href: '/checkout' },
  { label: 'Reminders', icon: 'alarm-outline' as const, href: '/reminders' },
  { label: 'Nearby pharmacies', icon: 'location-outline' as const, href: '/pharmacies' },
  { label: 'Favorites', icon: 'heart-outline' as const, href: '/' },
  { label: 'Help & support', icon: 'help-circle-outline' as const, href: '/(tabs)/ai' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, lastOrder, user, orderCount, selectedAddressId, addresses } = useApp();
  const home = addresses.find((item) => item.id === selectedAddressId) ?? addresses[0] ?? {
    id: '',
    label: 'Address',
    line: 'Add an address at checkout',
  };
  const initials = (user?.name ?? 'H')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Profile</Text>

      <View style={[styles.card, shadows.soft]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name ?? 'Loading…'}</Text>
          <Text style={styles.meta}>{user?.email ?? ''}</Text>
          <Text style={styles.meta}>{user?.phone || user?.city || ''}</Text>
        </View>
      </View>

      <View style={[styles.stats, shadows.soft]}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{favorites.length}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{lastOrder ? 1 : Math.min(orderCount, 9)}</Text>
          <Text style={styles.statLabel}>Active orders</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{addresses.length}</Text>
          <Text style={styles.statLabel}>Addresses</Text>
        </View>
      </View>

      <View style={[styles.address, shadows.soft]}>
        <View style={styles.homeIcon}>
          <Ionicons name="home" size={16} color={colors.accentDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.addressLabel}>{home.label}</Text>
          <Text style={styles.addressLine}>{home.line}</Text>
        </View>
      </View>

      <View style={[styles.menu, shadows.soft]}>
        {MENU.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.href as never)}
            style={[styles.menuItem, index < MENU.length - 1 && styles.menuBorder]}
          >
            <View style={styles.menuLeft}>
              <Ionicons name={item.icon} size={18} color={colors.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    color: colors.accentDark,
  },
  name: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 17,
  },
  meta: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
  },
  stats: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    fontSize: 18,
    color: colors.text,
  },
  statLabel: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
  },
  divider: {
    width: 1,
    backgroundColor: '#E8E8ED',
  },
  address: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  homeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: {
    fontWeight: '700',
    color: colors.text,
  },
  addressLine: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
  },
  menu: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  menuBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8ED',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontWeight: '600',
    color: colors.text,
  },
});
