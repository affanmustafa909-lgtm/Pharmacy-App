import { Haptics } from '@/lib/haptics';
import { router } from '@/navigation/router';
import type { RootStackParamList } from '@/navigation/types';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/CircleButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductVisual } from '@/components/ProductVisual';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useApp } from '@/context/AppContext';
import { loadAvailability, notifyBackInStock } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Product, StoreAvailability } from '@/types';

const { width } = Dimensions.get('window');
const CARD = width * 0.72;
const GAP = 16;
const ITEM_WIDTH = CARD + GAP;

export default function ProductDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Product'>>();
  const id = route.params?.id ?? '';
  const insets = useSafeAreaInsets();
  const {
    cartCount,
    favorites,
    addToCart,
    toggleFavorite,
    products,
    getProduct,
    catalogStatus,
    refreshCatalog,
    setSelectedStoreId,
    beginCheckout,
    isAuthenticated,
  } = useApp();
  const routeProduct = getProduct(id);
  const listRef = useRef<FlatList<Product>>(null);
  const [qty, setQty] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, products.findIndex((p) => p.id === id)));
  const [availability, setAvailability] = useState<StoreAvailability[]>([]);
  const [showStores, setShowStores] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
    }, [refreshCatalog]),
  );

  useEffect(() => {
    const index = Math.max(0, products.findIndex((p) => p.id === id));
    setActiveIndex(index);
    setQty(1);
    setExpanded(false);
    if (products.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: index * ITEM_WIDTH, animated: false });
    });
  }, [id, products]);

  const product = products[activeIndex] ?? routeProduct;

  const description = useMemo(() => {
    if (!product) return '';
    if (expanded) return `${product.longDescription} `;
    return `${product.description} `;
  }, [expanded, product]);

  const lineTotal = product ? product.price * qty : 0;

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
    const next = Math.max(0, Math.min(products.length - 1, index));
    if (next !== activeIndex) {
      setActiveIndex(next);
      setQty(1);
      setExpanded(false);
    }
  };

  if (!product) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <CircleButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={styles.title}>
          {catalogStatus === 'loading' ? 'Loading medicine…' : 'This medicine is not available.'}
        </Text>
      </View>
    );
  }

  const liked = favorites.includes(product.id);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <CircleButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={styles.brand}>Hera</Text>
        <CircleButton
          icon="bag-outline"
          badgeCount={cartCount}
          onPress={() => router.push('/(tabs)/cart')}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <FlatList
          ref={listRef}
          data={products}
          keyExtractor={(item) => item.id}
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={ITEM_WIDTH}
          snapToAlignment="start"
          disableIntervalMomentum
          getItemLayout={(_, index) => ({
            length: ITEM_WIDTH,
            offset: ITEM_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={onScrollEnd}
          contentContainerStyle={styles.carousel}
          renderItem={({ item }) => (
            <View style={styles.itemWrap}>
              <View style={[styles.visualCard, shadows.soft, { width: CARD }]}>
                <ProductVisual product={item} style={styles.visual} />
                {item.id === product.id ? (
                  <Pressable
                    onPress={() => {
                      void toggleFavorite(product.id).catch(() => undefined);
                    }}
                    style={[styles.heart, shadows.soft]}
                  >
                    <Ionicons
                      name={liked ? 'heart' : 'heart-outline'}
                      size={18}
                      color={liked ? '#E91E63' : colors.text}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
        />

        <View style={styles.dots}>
          {products.map((item, index) => (
            <View key={item.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.pack}>{product.packSize}</Text>
          </View>
          <Text style={styles.metaLine}>
            {[product.genericName && `Generic: ${product.genericName}`, product.strength && `Strength: ${product.strength}`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.metaLine}>
            {[product.brand && `Manufacturer: ${product.brand}`, product.storeName]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.metaLine}>
            {product.inStock
              ? `In stock${product.stock != null ? ` · ${product.stock} units` : ''}`
              : 'Out of stock at this store'}
          </Text>
          {product.rxRequired ? (
            <View style={styles.rxBadge}>
              <Text style={styles.rxText}>Prescription required</Text>
            </View>
          ) : null}
          <Text style={styles.description}>
            {description}
            <Text style={styles.more} onPress={() => setExpanded((v) => !v)}>
              {expanded ? 'less' : 'more'}
            </Text>
          </Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>{formatMoney(lineTotal)}</Text>
              {qty > 1 ? (
                <Text style={styles.unitPrice}>{formatMoney(product.price)} each</Text>
              ) : null}
            </View>
            <QuantityStepper value={qty} onChange={setQty} />
          </View>

          <View style={styles.actionRow}>
            {product.rxRequired ? (
              <Pressable style={styles.secondaryBtn} onPress={() => router.push('/scan')}>
                <Text style={styles.secondaryText}>Upload Rx</Text>
              </Pressable>
            ) : null}
            {!product.inStock ? (
              <>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => {
                    void loadAvailability(product.id).then((payload) => {
                      setAvailability(payload.stores);
                      setShowStores(true);
                    });
                  }}
                >
                  <Text style={styles.secondaryText}>Check nearby stores</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => {
                    void notifyBackInStock(product.id)
                      .then(() => setNotifyMsg('We will notify you when this is back in stock.'))
                      .catch((error: unknown) =>
                        setNotifyMsg(error instanceof Error ? error.message : 'Could not set alert'),
                      );
                  }}
                >
                  <Text style={styles.secondaryText}>Notify me</Text>
                </Pressable>
              </>
            ) : null}
          </View>
          {notifyMsg ? <Text style={styles.notifyMsg}>{notifyMsg}</Text> : null}
          {showStores ? (
            <View style={styles.storeList}>
              <Text style={styles.storeTitle}>Nearby store availability</Text>
              {availability.length === 0 ? (
                <Text style={styles.unitPrice}>No other stores found for this medicine.</Text>
              ) : (
                availability.map((store) => (
                  <Pressable
                    key={store.productId}
                    style={styles.storeRow}
                    onPress={() => {
                      setSelectedStoreId(store.storeId);
                      setShowStores(false);
                      router.push(`/product/${store.productId}`);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.storeName}>{store.storeName}</Text>
                      <Text style={styles.unitPrice}>
                        {store.inStock ? `${store.stock} in stock` : 'Out of stock'} · Open until {store.openUntil}
                      </Text>
                    </View>
                    <Text style={styles.storePrice}>{formatMoney(store.price)}</Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerRow}>
          <PrimaryButton
            label={
              product.rxRequired && product.inStock
                ? `Add ${qty}`
                : product.inStock
                  ? `Add ${qty}`
                  : 'Unavailable'
            }
            icon="bag-outline"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => {
              if (!product.inStock) return;
              addToCart(product.id, qty);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.toCart();
            }}
          />
          <PrimaryButton
            label={product.inStock ? `Buy · ${formatMoney(lineTotal)}` : 'Unavailable'}
            style={{ flex: 1.2 }}
            disabled={!product.inStock}
            onPress={() => {
              if (!product.inStock) return;
              addToCart(product.id, qty);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (isAuthenticated) {
                router.push('/checkout');
                return;
              }
              beginCheckout();
              router.push('/auth?returnTo=Checkout');
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  carousel: {
    paddingHorizontal: (width - CARD) / 2,
  },
  itemWrap: {
    width: ITEM_WIDTH,
  },
  visualCard: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  visual: {
    minHeight: 340,
    height: 340,
  },
  heart: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  dotActive: {
    backgroundColor: colors.text,
    width: 16,
  },
  body: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  pack: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  metaLine: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rxBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.chipOrange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  rxText: {
    color: colors.chipOrangeText,
    fontWeight: '700',
    fontSize: 12,
  },
  actionRow: {
    marginTop: spacing.lg,
    gap: 8,
  },
  secondaryBtn: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  secondaryText: {
    color: colors.accentDark,
    fontWeight: '700',
    textAlign: 'center',
  },
  notifyMsg: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 13,
  },
  storeList: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 10,
  },
  storeTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeName: {
    fontWeight: '700',
    color: colors.text,
  },
  storePrice: {
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  more: {
    fontWeight: '700',
    color: colors.text,
  },
  priceRow: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  unitPrice: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
