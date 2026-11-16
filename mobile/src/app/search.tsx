import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/CircleButton';
import { ProductVisual } from '@/components/ProductVisual';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/format';
import { loadCatalog, loadCategories, loadStrengths, loadStores, loadSuggestions } from '@/lib/api';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Pharmacy, Product, SearchSuggestion } from '@/types';

type StockFilter = 'all' | 'in' | 'out';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { refreshCatalog, selectedStoreId } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [strength, setStrength] = useState('all');
  const [storeId, setStoreId] = useState(selectedStoreId ?? 'all');
  const [stock, setStock] = useState<StockFilter>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [stores, setStores] = useState<Pharmacy[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
      if (selectedStoreId) setStoreId(selectedStoreId);
    }, [refreshCatalog, selectedStoreId]),
  );

  useEffect(() => {
    let cancel = false;
    void Promise.all([loadCategories(), loadStores(), loadStrengths(selectedStoreId || undefined)])
      .then(([nextCategories, nextStores, nextStrengths]) => {
        if (cancel) return;
        setCategories(nextCategories);
        setStores(nextStores);
        setStrengths(nextStrengths);
        if (selectedStoreId && nextStores.some((store) => store.id === selectedStoreId)) {
          setStoreId(selectedStoreId);
        }
      })
      .catch(() => {
        if (cancel) return;
        setCategories([]);
        setStores([]);
        setStrengths([]);
      });
    return () => {
      cancel = true;
    };
  }, [selectedStoreId]);

  useEffect(() => {
    let cancel = false;
    const timer = setTimeout(() => {
      void loadSuggestions(query.trim())
        .then((next) => {
          if (!cancel) setSuggestions(next);
        })
        .catch(() => {
          if (!cancel) setSuggestions([]);
        });
    }, 120);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    let cancel = false;
    setStatus('loading');
    setError('');
    const timer = setTimeout(() => {
      void loadCatalog({
        q: query.trim() || undefined,
        storeId: storeId === 'all' ? undefined : storeId,
        category: category === 'all' ? undefined : category,
        strength: strength === 'all' ? undefined : strength,
        inStock: stock === 'all' ? undefined : stock === 'in',
      })
        .then((products) => {
          if (cancel) return;
          setResults(products);
          setStatus('ready');
        })
        .catch((err: unknown) => {
          if (cancel) return;
          setResults([]);
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Could not load medicines');
        });
    }, 180);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [query, category, strength, storeId, stock]);

  const activeFilters = useMemo(() => {
    const chips: string[] = [];
    if (category !== 'all') chips.push(category);
    if (strength !== 'all') chips.push(strength);
    if (storeId !== 'all') {
      const store = stores.find((item) => item.id === storeId);
      if (store) chips.push(store.name);
    }
    if (stock === 'in') chips.push('In stock');
    if (stock === 'out') chips.push('Out of stock');
    return chips;
  }, [category, strength, storeId, stock, stores]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <CircleButton icon="close" onPress={() => router.back()} />
        <View style={[styles.searchBar, shadows.soft]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search brand or generic name..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>
      </View>

      {suggestions.length > 0 && query.trim() ? (
        <View style={styles.suggestBox}>
          {suggestions.map((item) => (
            <Pressable
              key={`${item.type}-${item.label}`}
              onPress={() => setQuery(item.q)}
              style={styles.suggestRow}
            >
              <Text style={styles.suggestType}>{item.type}</Text>
              <Text style={styles.suggestLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <FilterChip
          label="All categories"
          active={category === 'all'}
          onPress={() => setCategory('all')}
        />
        {categories.map((item) => (
          <FilterChip
            key={item}
            label={item}
            active={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <FilterChip label="Any strength" active={strength === 'all'} onPress={() => setStrength('all')} />
        {strengths.map((item) => (
          <FilterChip
            key={item}
            label={item}
            active={strength === item}
            onPress={() => setStrength(item)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <FilterChip label="All stores" active={storeId === 'all'} onPress={() => setStoreId('all')} />
        {stores.map((store) => (
          <FilterChip
            key={store.id}
            label={store.name}
            active={storeId === store.id}
            onPress={() => setStoreId(store.id)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { marginBottom: spacing.md }]}
      >
        <FilterChip label="Any stock" active={stock === 'all'} onPress={() => setStock('all')} />
        <FilterChip label="In stock" active={stock === 'in'} onPress={() => setStock('in')} />
        <FilterChip label="Out of stock" active={stock === 'out'} onPress={() => setStock('out')} />
      </ScrollView>

      <Text style={styles.count}>
        {status === 'loading'
          ? 'Filtering…'
          : `${results.length} product${results.length === 1 ? '' : 's'}${
              activeFilters.length ? ` · ${activeFilters.join(' · ')}` : ''
            }`}
      </Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {status === 'loading'
              ? 'Loading medicines…'
              : status === 'error'
                ? error
                : query || activeFilters.length
                  ? 'No products match these filters.'
                  : 'No medicines are available right now.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/product/${item.id}`)}
            style={[styles.row, shadows.soft]}
          >
            <ProductVisual product={item} compact style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {[item.genericName || item.brand, item.strength, item.unitLabel].filter(Boolean).join(' · ')}
                {item.inStock ? '' : ' · Out of stock'}
                {item.rxRequired ? ' · Rx' : ''}
              </Text>
              <Text style={styles.price}>{formatMoney(item.price)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, shadows.soft, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  searchBar: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  suggestBox: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  suggestRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  suggestType: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentDark,
    textTransform: 'uppercase',
    width: 58,
  },
  suggestLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  filters: {
    paddingHorizontal: spacing.xl,
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    maxWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.primaryContrast,
  },
  count: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  thumb: {
    width: 64,
    minHeight: 64,
  },
  name: {
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },
  price: {
    marginTop: 4,
    fontWeight: '700',
    color: colors.text,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: colors.textSecondary,
  },
});
