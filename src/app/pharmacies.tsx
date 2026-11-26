import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { loadStores } from '@/lib/api';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Pharmacy } from '@/types';

export default function PharmaciesScreen() {
  const insets = useSafeAreaInsets();
  const { selectedStoreId, setSelectedStoreId } = useApp();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancel = false;
      setStatus('loading');
      loadStores()
        .then((next) => {
          if (cancel) return;
          setPharmacies(next);
          setStatus('ready');
        })
        .catch((err: unknown) => {
          if (cancel) return;
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Could not load stores');
        });
      return () => {
        cancel = true;
      };
    }, []),
  );

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Stores" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Choose a store to see its products, prices, and stock in the app.</Text>
        {status === 'loading' ? <ActivityIndicator color={colors.accent} /> : null}
        {status === 'error' ? <Text style={styles.meta}>{error}</Text> : null}
        {status === 'ready' && pharmacies.length === 0 ? (
          <Text style={styles.meta}>No open stores right now.</Text>
        ) : null}
        {pharmacies.map((pharmacy) => {
          const selected = pharmacy.id === selectedStoreId;
          return (
            <Pressable
              key={pharmacy.id}
              onPress={() => setSelectedStoreId(pharmacy.id)}
              style={[styles.card, shadows.soft, selected && styles.selected]}
            >
              <View style={styles.icon}>
                <Ionicons name="storefront" size={18} color={colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{pharmacy.name}</Text>
                <Text style={styles.meta}>{pharmacy.address}</Text>
                <Text style={styles.meta}>
                  Open until {pharmacy.openUntil} · ★ {pharmacy.rating}
                </Text>
                {selected ? <Text style={styles.active}>Shopping here</Text> : null}
              </View>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'chevron-forward'}
                size={20}
                color={selected ? colors.accentDark : colors.textSecondary}
              />
            </Pressable>
          );
        })}
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
    gap: spacing.md,
  },
  hint: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: colors.accent,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 16,
  },
  meta: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 13,
  },
  active: {
    marginTop: 6,
    color: colors.accentDark,
    fontWeight: '700',
    fontSize: 12,
  },
});
