import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { colors, radii, shadows, spacing } from '@/theme';

const MENU = [
  { label: 'My orders', icon: 'receipt-outline' as const, href: '/orders', auth: true },
  { label: 'Account settings', icon: 'settings-outline' as const, href: '/account-settings', auth: true },
  { label: 'My Requests', icon: 'document-text-outline' as const, href: '/prescriptions', auth: true },
  { label: 'Notifications', icon: 'notifications-outline' as const, href: '/notifications', auth: true },
  { label: 'Addresses', icon: 'home-outline' as const, href: '/addresses', auth: true },
  { label: 'Reminders', icon: 'alarm-outline' as const, href: '/reminders', auth: true },
  { label: 'Nearby pharmacies', icon: 'location-outline' as const, href: '/pharmacies', auth: false },
  { label: 'Favorites', icon: 'heart-outline' as const, href: '/', auth: false },
  { label: 'Help & support', icon: 'help-circle-outline' as const, href: '/(tabs)/ai', auth: false },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, lastOrder, user, orderCount, selectedAddressId, addresses, isAuthenticated, signOut } = useApp();
  const home = addresses.find((item) => item.id === selectedAddressId) ?? addresses[0] ?? {
    id: '',
    label: 'Address',
    recipientName: '',
    phone: '',
    houseNo: '',
    street: '',
    area: '',
    city: '',
    line: 'Add an address at checkout',
  };
  const displayName = isAuthenticated ? user?.name ?? 'Customer' : 'Guest';
  const initials = displayName
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
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.meta}>
            {isAuthenticated ? user?.email ?? '' : 'Browsing as guest — sign in to check out'}
          </Text>
          {isAuthenticated ? <Text style={styles.meta}>{user?.phone || user?.city || ''}</Text> : null}
        </View>
      </View>

      {!isAuthenticated ? (
        <View style={{ marginTop: spacing.lg, gap: 10 }}>
          <PrimaryButton label="Sign in" onPress={() => router.push('/auth?returnTo=Profile')} />
          <PrimaryButton
            label="Create account"
            variant="outline"
            onPress={() => router.push('/signup?returnTo=Profile')}
          />
        </View>
      ) : null}

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
            onPress={() => {
              if (item.auth && !isAuthenticated) {
                const returnTo =
                  item.href === '/orders'
                    ? 'Orders'
                    : item.href === '/addresses'
                      ? 'Addresses'
                      : item.href === '/reminders'
                        ? 'Reminders'
                        : item.href === '/prescriptions'
                          ? 'My Requests'
                          : item.href === '/notifications'
                            ? 'Notifications'
                            : 'Profile';
                router.push(`/auth?returnTo=${returnTo}`);
                return;
              }
              router.push(item.href as never);
            }}
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

      {isAuthenticated ? (
        <Pressable
          style={[styles.signOut, shadows.soft]}
          onPress={() => {
            void signOut();
          }}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      ) : null}
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
  signOut: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontWeight: '700',
    color: colors.danger,
  },
});
