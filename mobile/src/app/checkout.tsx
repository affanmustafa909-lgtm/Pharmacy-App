import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const {
    cartCount,
    total,
    addresses,
    deliveryOptions,
    paymentMethods,
    selectedAddressId,
    selectedDeliveryId,
    selectedPaymentId,
    setSelectedDeliveryId,
    setSelectedPaymentId,
    placeOrder,
    quote,
    quoteError,
    selectedStore,
    prescriptionNumber,
  } = useApp();
  const [processing, setProcessing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const address = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0] ?? {
    id: '',
    label: 'Address',
    line: 'No saved address',
  };
  const delivery =
    deliveryOptions.find((option) => option.id === selectedDeliveryId) ??
    deliveryOptions[0] ?? {
      id: 'express' as const,
      title: 'Express',
      eta: '20-30 min',
      priceLabel: 'From charges',
    };
  const isPickup = selectedDeliveryId === 'pickup';

  const onPay = () => {
    if (processing) return;
    if (cartCount === 0) {
      setOrderError('Cart is empty');
      return;
    }
    setProcessing(true);
    setOrderError('');
    void placeOrder()
      .then(() => {
        router.replace('/order-success');
      })
      .catch((error: unknown) => {
        setOrderError(error instanceof Error ? error.message : 'Could not place the order');
      })
      .finally(() => setProcessing(false));
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScreenHeader title="Checkout" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.section}>{isPickup ? 'Pickup store' : 'Deliver to'}</Text>
        {isPickup ? (
          <View style={[styles.card, shadows.soft]}>
            <View style={styles.homeIcon}>
              <Ionicons name="storefront" size={16} color={colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{selectedStore?.name ?? 'Selected pharmacy'}</Text>
              <Text style={styles.cardMeta}>
                {selectedStore?.address ?? 'Store address'}
                {selectedStore?.openUntil ? ` · Open until ${selectedStore.openUntil}` : ''}
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/addresses')}
            style={[styles.card, shadows.soft]}
          >
            <View style={styles.homeIcon}>
              <Ionicons name="home" size={16} color={colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {address.id ? address.label : 'Add delivery address'}
              </Text>
              <Text style={styles.cardMeta}>
                {address.id ? address.line : 'Client adds the address they want delivered to'}
              </Text>
            </View>
            <Text style={styles.change}>{address.id ? 'Change' : 'Add'}</Text>
          </Pressable>
        )}

        <Text style={styles.section}>Delivery</Text>
        <View style={styles.deliveryRow}>
          {deliveryOptions.map((option) => {
            const selected = option.id === selectedDeliveryId;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelectedDeliveryId(option.id)}
                style={[
                  styles.deliveryCard,
                  shadows.soft,
                  selected && styles.deliverySelected,
                ]}
              >
                <Text style={styles.deliveryTitle}>
                  {option.title}
                  {option.highlighted ? ' ⚡' : ''}
                </Text>
                <Text style={styles.cardMeta}>
                  {quote && option.id === selectedDeliveryId && quote.etaMinutes
                    ? `About ${quote.etaMinutes} min`
                    : option.eta}
                </Text>
                <Text style={styles.free}>
                  {quote
                    ? option.id === selectedDeliveryId
                      ? formatMoney(quote.deliveryCharge)
                      : option.priceLabel
                    : option.priceLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {quote?.requiresPrescription ? (
          <Text style={styles.cardMeta}>
            {prescriptionNumber
              ? `Using verified prescription ${prescriptionNumber}`
              : 'Prescription medicines need pharmacist verification before place order.'}
          </Text>
        ) : null}
        {quoteError ? <Text style={styles.cardMeta}>{quoteError}</Text> : null}
        {cartCount === 0 ? <Text style={styles.cardMeta}>Cart is empty. Add medicines before checkout.</Text> : null}

        <Text style={styles.section}>Charges</Text>
        <View style={[styles.card, shadows.soft, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
          <View style={styles.chargeRow}>
            <Text style={styles.cardMeta}>Products</Text>
            <Text style={styles.cardTitle}>{formatMoney(quote?.productSubtotal ?? total)}</Text>
          </View>
          <View style={styles.chargeRow}>
            <Text style={styles.cardMeta}>Delivery</Text>
            <Text style={styles.cardTitle}>{formatMoney(quote?.deliveryCharge ?? 0)}</Text>
          </View>
          <View style={styles.chargeRow}>
            <Text style={styles.cardMeta}>Service</Text>
            <Text style={styles.cardTitle}>{formatMoney(quote?.serviceCharge ?? 0)}</Text>
          </View>
          {quote && quote.bfpCharge > 0 ? (
            <View style={styles.chargeRow}>
              <Text style={styles.cardMeta}>BFP</Text>
              <Text style={styles.cardTitle}>{formatMoney(quote.bfpCharge)}</Text>
            </View>
          ) : null}
          <View style={styles.chargeRow}>
            <Text style={styles.cardTitle}>Total</Text>
            <Text style={styles.cardTitle}>{formatMoney(quote?.total ?? total)}</Text>
          </View>
        </View>

        <Text style={styles.section}>Payment</Text>
        {paymentMethods.map((method) => {
          const selected = method.id === selectedPaymentId;
          return (
            <Pressable
              key={method.id}
              onPress={() => setSelectedPaymentId(method.id)}
              style={[styles.paymentCard, shadows.soft]}
            >
              <View
                style={[
                  styles.payBadge,
                  method.type === 'apple_pay' ? styles.apple : styles.visa,
                ]}
              >
                <Text
                  style={[
                    styles.payBadgeText,
                    method.type === 'card' && { color: '#1A237E' },
                  ]}
                >
                  {method.type === 'apple_pay' ? ' Pay' : 'VISA'}
                </Text>
              </View>
              <Text style={styles.paymentLabel}>
                {method.label}
                {method.detail ? ` ${method.detail}` : ''}
              </Text>
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerMeta}>
            {cartCount} items · {delivery?.title ?? 'Delivery'}
          </Text>
          {orderError ? <Text style={styles.cardMeta}>{orderError}</Text> : null}
          <Text style={styles.footerTotal}>{formatMoney(quote?.total ?? total)}</Text>
        </View>
        <PrimaryButton
          label={
            processing
              ? 'Processing...'
              : cartCount === 0
                ? 'Cart is empty'
                : isPickup
                  ? 'Place pickup order'
                  : 'Place Order'
          }
          loading={processing}
          onPress={onPay}
          style={{ flex: 1, marginLeft: 16 }}
        />
      </View>
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
    paddingBottom: 24,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  homeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
  },
  change: {
    color: colors.accentDark,
    fontWeight: '700',
  },
  deliveryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deliveryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  deliverySelected: {
    borderColor: colors.borderStrong,
  },
  deliveryTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  free: {
    marginTop: 8,
    color: colors.accentDark,
    fontWeight: '700',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  payBadge: {
    minWidth: 52,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  apple: {
    backgroundColor: colors.primary,
  },
  visa: {
    backgroundColor: '#E8EEFF',
  },
  payBadgeText: {
    color: colors.primaryContrast,
    fontWeight: '800',
    fontSize: 11,
  },
  paymentLabel: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  footerMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  footerTotal: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
});
