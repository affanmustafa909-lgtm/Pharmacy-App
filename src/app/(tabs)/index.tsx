import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

const enter = (delay = 0) =>
  FadeInDown.delay(delay).duration(450).reduceMotion(ReduceMotion.Never);
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/CircleButton';
import { ProductCard } from '@/components/ProductCard';
import { useApp } from '@/context/AppContext';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Product } from '@/types';

const PRODUCT_CARD_WIDTH = 270;
const PRODUCT_CARD_GAP = 16;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { products, catalogStatus, catalogError, user, refreshCatalog, mobileConfig, selectedStore, isAuthenticated } =
    useApp();
  const quickActions = mobileConfig.quickActions;

  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
    }, [refreshCatalog]),
  );
  const displayName = isAuthenticated ? user?.name ?? 'Hera' : 'Guest';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const location = user?.city || selectedStore?.address || 'Browse nearby stores';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enter()} style={styles.header}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{displayName}</Text>
              <Pressable style={styles.locationRow} onPress={() => router.push('/pharmacies')}>
                <Ionicons name="storefront" size={13} color={colors.text} />
                <Text style={styles.location}>{selectedStore?.name ?? location}</Text>
              </Pressable>
            </View>
            <CircleButton icon="notifications-outline" showDot onPress={() => router.push('/notifications')} />
          </View>

          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLight}>{mobileConfig.heroLight}</Text>
              <Text style={styles.heroBold}>{mobileConfig.heroBold}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/search')}
            style={[styles.searchBar, shadows.soft]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <Text style={styles.searchPlaceholder}>Search brand or generic name</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={enter(80)} style={styles.actions}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => router.push(action.href as never)}
              style={({ pressed }) => [
                styles.actionBtn,
                shadows.soft,
                pressed && { opacity: 0.88 },
              ]}
            >
              <Ionicons name={action.icon as never} size={18} color={colors.text} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </Animated.View>

        <Animated.View entering={enter(140)} style={styles.productsWrap}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Featured medicines</Text>
            <Pressable onPress={() => router.push('/search')}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>
          {catalogStatus === 'loading' ? (
            <Text style={styles.actionLabel}>Loading medicines…</Text>
          ) : null}
          {catalogStatus === 'error' ? (
            <Text style={styles.actionLabel}>{catalogError}</Text>
          ) : null}
          {catalogStatus === 'ready' && products.length === 0 ? (
            <Text style={styles.actionLabel}>No medicines are available right now.</Text>
          ) : null}
          {catalogStatus === 'ready' && products.length > 0 ? (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={PRODUCT_CARD_WIDTH + PRODUCT_CARD_GAP}
              snapToAlignment="start"
              disableIntervalMomentum
              contentContainerStyle={styles.products}
              renderItem={({ item }: { item: Product }) => (
                <ProductCard product={item} width={PRODUCT_CARD_WIDTH} />
              )}
            />
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
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
  header: {
    marginBottom: spacing.xl,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D7E8F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    color: colors.text,
  },
  userName: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  location: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroLight: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: -0.8,
  },
  heroBold: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.8,
  },
  searchBar: {
    marginTop: spacing.lg,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  searchPlaceholder: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  sectionHead: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accentDark,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  actionBtn: {
    width: '47%',
    flexGrow: 1,
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  productsWrap: {
    marginHorizontal: -spacing.xl,
  },
  products: {
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
  },
});
