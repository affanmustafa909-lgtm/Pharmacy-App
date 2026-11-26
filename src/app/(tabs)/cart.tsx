import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartItemCard } from '@/components/CartItemCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const {
    cart,
    cartCount,
    discount,
    subtotal,
    total,
    promoApplied,
    activePromo,
    setQuantity,
    applyPromo,
    getProduct,
    quote,
    quoteError,
    storeSwitchMessage,
    catalogStatus,
    catalogError,
    refreshCatalog,
    beginCheckout,
  } = useApp();
  const [code, setCode] = useState(activePromo?.code ?? '');
  const [promoError, setPromoError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
    }, [refreshCatalog]),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
        <Text style={styles.count}>{cartCount} items</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {cart.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {catalogStatus === 'error' ? 'Could not load medicines' : 'Your cart is empty'}
            </Text>
            <Text style={styles.emptyBody}>
              {catalogStatus === 'loading'
                ? 'Loading the catalog…'
                : catalogStatus === 'error'
                  ? catalogError
                  : 'Browse medicines and add them to your cart.'}
            </Text>
            <PrimaryButton label="Browse products" onPress={() => router.push('/')} />
          </View>
        ) : (
          <>
            {storeSwitchMessage ? <Text style={styles.emptyBody}>{storeSwitchMessage}</Text> : null}
            {quoteError ? <Text style={styles.emptyBody}>{quoteError}</Text> : null}
            {cart.map((item) => {
              const product = getProduct(item.productId);
              if (!product) return null;
              return (
                <CartItemCard
                  key={item.productId}
                  product={product}
                  quantity={item.quantity}
                  onChangeQuantity={(qty) => setQuantity(item.productId, qty)}
                />
              );
            })}

            <View style={[styles.promo, shadows.soft]}>
              <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
              <TextInput
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                placeholder="Promo code"
                placeholderTextColor={colors.textMuted}
                style={styles.promoInput}
              />
              <Pressable
                onPress={() => {
                  setPromoError('');
                  void applyPromo(code).then((ok) => {
                    if (!ok) setPromoError('Promo code not found');
                  });
                }}
                style={({ pressed }) => [styles.apply, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
            {promoError ? <Text style={styles.emptyBody}>{promoError}</Text> : null}

            <View style={[styles.summary, shadows.soft]}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Products</Text>
                <Text style={styles.summaryValue}>
                  {formatMoney(quote?.productSubtotal ?? subtotal)}
                </Text>
              </View>
              {promoApplied && activePromo ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Promo ({activePromo.code})</Text>
                  <Text style={[styles.summaryValue, { color: colors.accent }]}>
                    -{formatMoney(discount)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>
                  {quote ? formatMoney(quote.deliveryCharge ?? 0) : '—'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service</Text>
                <Text style={styles.summaryValue}>
                  {quote ? formatMoney(quote.serviceCharge ?? 0) : '—'}
                </Text>
              </View>
              {quote && (quote.bfpCharge ?? 0) > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>BFP</Text>
                  <Text style={styles.summaryValue}>{formatMoney(quote.bfpCharge)}</Text>
                </View>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatMoney(quote?.total ?? total)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {cart.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 72 }]}>
          <PrimaryButton
            label={`Checkout · ${formatMoney(total)}`}
            onPress={() => {
              const next = beginCheckout();
              router.push(next === 'auth' ? '/auth?returnTo=Checkout' : '/checkout');
            }}
          />
        </View>
      ) : null}
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
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  count: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  empty: {
    marginTop: 80,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptyBody: {
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  promo: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    paddingLeft: spacing.lg,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
  },
  promoInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: 10,
  },
  apply: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  applyText: {
    color: colors.primaryContrast,
    fontWeight: '700',
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  summaryValue: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'transparent',
  },
});
