import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardPaymentModal } from '@/components/CardPaymentModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { isAddressComplete, missingAddressFields } from '@/lib/addressComplete';
import type { SimulatedPayment } from '@/lib/api';
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
    setSelectedStoreId,
    placeOrder,
    quote,
    quoteError,
    selectedStoreId,
    selectedStore,
    prescriptionNumber,
    isAuthenticated,
    authReady,
    beginCheckout,
    clearPendingCheckout,
    pickupName,
    pickupPhone,
    setPickupName,
    setPickupPhone,
    user,
    nearbyStores,
    nearbyMessage,
    nearbyLoading,
    nearbyStatus,
    refreshNearbyStores,
    checkoutPlan,
    confirmSplit,
    setConfirmSplit,
    refreshAddresses,
  } = useApp();
  const [processing, setProcessing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [cardPayOpen, setCardPayOpen] = useState(false);
  const [paidTransactionId, setPaidTransactionId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!authReady) return;
      if (!isAuthenticated) {
        beginCheckout();
        router.replace('/auth?returnTo=Checkout');
        return;
      }
      clearPendingCheckout();
      if (!pickupName && user?.name) setPickupName(user.name);
      if (!pickupPhone && user?.phone) setPickupPhone(user.phone);
      void refreshAddresses()
        .then((list) => {
          if (list.some((row) => row.id === selectedAddressId) || list.length > 0) {
            setOrderError((prev) =>
              /address/i.test(prev) ? '' : prev,
            );
          }
        })
        .catch(() => undefined);
    }, [
      authReady,
      isAuthenticated,
      beginCheckout,
      clearPendingCheckout,
      pickupName,
      pickupPhone,
      setPickupName,
      setPickupPhone,
      user?.name,
      user?.phone,
      refreshAddresses,
      selectedAddressId,
    ]),
  );

  const address = addresses.find((a) => a.id === selectedAddressId);
  const addressReady = isAddressComplete(address);
  const delivery =
    deliveryOptions.find((option) => option.id === selectedDeliveryId) ?? deliveryOptions[0];
  const isPickup = selectedDeliveryId === 'pickup';
  const selectedPayment = paymentMethods.find((method) => method.id === selectedPaymentId);
  const isCod = selectedPayment?.type === 'cod' || selectedPayment?.id === 'cod';
  const isCardPayment =
    selectedPayment?.type === 'card' ||
    selectedPayment?.type === 'debit_card' ||
    selectedPayment?.type === 'credit_card';
  const cardMethod: 'debit_card' | 'credit_card' =
    selectedPayment?.type === 'credit_card' ? 'credit_card' : 'debit_card';

  useEffect(() => {
    if (!isAuthenticated || isPickup) return;
    if (address && !isAddressComplete(address)) {
      router.push(
        `/addresses?completeId=${encodeURIComponent(address.id)}&returnTo=Checkout`,
      );
    }
  }, [isAuthenticated, isPickup, address?.id, address?.recipientName, address?.houseNo, address?.area, address?.lat]);

  useEffect(() => {
    if (!isAuthenticated || isPickup || !addressReady) {
      return;
    }
    void refreshNearbyStores().catch(() => undefined);
  }, [isAuthenticated, isPickup, addressReady, address?.id, address?.line, cartCount, refreshNearbyStores]);

  useEffect(() => {
    if (addressReady) {
      setOrderError((prev) => (/address|deliver|missing/i.test(prev) ? '' : prev));
    }
  }, [addressReady, address?.id]);

  useEffect(() => {
    if (isPickup || nearbyStores.length === 0) return;
    const stillValid = nearbyStores.some((store) => store.id === selectedStoreId);
    if (stillValid) return;
    const preferred =
      nearbyStores.find((store) => store.canFulfillAll) ?? nearbyStores[0];
    if (preferred) setSelectedStoreId(preferred.id);
  }, [isPickup, nearbyStores, selectedStoreId, setSelectedStoreId]);

  useEffect(() => {
    if (paymentMethods.some((method) => method.id === selectedPaymentId)) return;
    const cod = paymentMethods.find((method) => method.type === 'cod' || method.id === 'cod');
    setSelectedPaymentId(cod?.id ?? paymentMethods[0]?.id ?? 'cod');
  }, [paymentMethods, selectedPaymentId, setSelectedPaymentId]);

  // Don't block pay when charges already calculated — coverage API/geocoder can flake.
  const coverageBlocksCheckout =
    nearbyStatus === 'loading' ||
    ((nearbyStatus === 'unavailable' || nearbyStatus === 'error') && !quote);
  const deliveryBlocked =
    !isPickup &&
    (!address ||
      !addressReady ||
      !quote ||
      Boolean(quoteError) ||
      coverageBlocksCheckout ||
      (checkoutPlan?.split && !confirmSplit));
  const pickupBlocked = isPickup && (!pickupName.trim() || !pickupPhone.trim() || !selectedStore);

  const submitOrder = (opts?: {
    paymentConfirmed?: boolean;
    expectedTotal?: number;
    paymentTransactionId?: string;
  }) => {
    if (processing) return;
    setProcessing(true);
    setOrderError('');
    void placeOrder({
      paymentConfirmed: opts?.paymentConfirmed ?? isCod,
      expectedTotal: opts?.expectedTotal ?? quote?.total,
      paymentTransactionId: opts?.paymentTransactionId,
    })
      .then(() => {
        setCardPayOpen(false);
        setPaidTransactionId(null);
        router.replace('/order-success');
      })
      .catch((error: unknown) => {
        const err = error as Error & { code?: string; revisedTotal?: number };
        if (err.code === 'CARD_PAYMENT_REQUIRED' || (err.code === 'PAYMENT_CONFIRM_REQUIRED' && isCardPayment)) {
          setCardPayOpen(true);
          return;
        }
        if (err.code === 'PAYMENT_CONFIRM_REQUIRED') {
          Alert.alert(
            'Confirm payment',
            `Confirm ${selectedPayment?.label ?? 'payment'} of ${formatMoney(quote?.total ?? total)} to place this order.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm paid',
                onPress: () => submitOrder({ paymentConfirmed: true, expectedTotal: quote?.total }),
              },
            ],
          );
          return;
        }
        if (err.code === 'TOTAL_CHANGED' && err.revisedTotal != null) {
          Alert.alert(
            'Total updated',
            err.message,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm new total',
                onPress: () =>
                  submitOrder({
                    paymentConfirmed: Boolean(opts?.paymentTransactionId) || !isCardPayment,
                    expectedTotal: err.revisedTotal,
                    paymentTransactionId: opts?.paymentTransactionId ?? paidTransactionId ?? undefined,
                  }),
              },
            ],
          );
          return;
        }
        const message = err instanceof Error ? err.message : 'Could not place the order';
        setOrderError(message);
        if (opts?.paymentTransactionId || paidTransactionId) {
          Alert.alert(
            'Payment captured, order not placed',
            `${message}\n\nYour card payment is saved. Tap retry to confirm the order without paying again.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Retry order',
                onPress: () =>
                  submitOrder({
                    paymentConfirmed: true,
                    expectedTotal: quote?.total,
                    paymentTransactionId: opts?.paymentTransactionId ?? paidTransactionId ?? undefined,
                  }),
              },
            ],
          );
          return;
        }
        Alert.alert('Could not place order', message);
      })
      .finally(() => setProcessing(false));
  };

  const onCardPaid = (payment: SimulatedPayment) => {
    setPaidTransactionId(payment.id);
    submitOrder({
      paymentConfirmed: true,
      expectedTotal: quote?.total,
      paymentTransactionId: payment.id,
    });
  };

  const onPay = () => {
    if (processing) return;
    if (cartCount === 0) {
      setOrderError('Cart is empty');
      return;
    }
    if (isPickup) {
      if (!pickupName.trim() || !pickupPhone.trim()) {
        setOrderError('Enter your name and phone for pickup');
        return;
      }
      if (!selectedStore) {
        setOrderError('Select a pharmacy for pickup');
        return;
      }
    } else if (!address) {
      setOrderError('Add a delivery address to continue');
      router.push('/addresses?returnTo=Checkout');
      return;
    } else if (!addressReady) {
      setOrderError(
        `Complete address details: ${missingAddressFields(address).join(', ')}.`,
      );
      router.push(
        `/addresses?completeId=${encodeURIComponent(address.id)}&returnTo=Checkout`,
      );
      return;
    } else if (nearbyStatus === 'loading') {
      setOrderError('Coverage check is still running.');
      return;
    } else if ((nearbyStatus === 'unavailable' || nearbyStatus === 'error') && !quote) {
      setOrderError(nearbyMessage || 'Delivery is not available for this address.');
      return;
    } else if (!quote || quoteError) {
      setOrderError(quoteError || 'Charges are still loading. Wait a moment and try again.');
      return;
    }
    if (checkoutPlan?.split && !confirmSplit) {
      setOrderError('Confirm the multi-store split before placing orders');
      return;
    }
    if (isCardPayment) {
      if (paidTransactionId) {
        submitOrder({ paymentConfirmed: true, paymentTransactionId: paidTransactionId });
        return;
      }
      setCardPayOpen(true);
      return;
    }
    submitOrder();
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScreenHeader title="Checkout" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>{isPickup ? 'Pickup contact' : 'Deliver to'}</Text>
        {isPickup ? (
          <View style={[styles.card, shadows.soft, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <Text style={styles.cardTitle}>{selectedStore?.name ?? 'Selected pharmacy'}</Text>
            <Text style={styles.cardMeta}>{selectedStore?.address ?? 'Store address'}</Text>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              value={pickupName}
              onChangeText={setPickupName}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={pickupPhone}
              onChangeText={setPickupPhone}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        ) : (
          <Pressable
            onPress={() =>
              router.push(
                address && !addressReady
                  ? `/addresses?completeId=${encodeURIComponent(address.id)}&returnTo=Checkout`
                  : '/addresses?returnTo=Checkout',
              )
            }
            style={[styles.card, shadows.soft]}
          >
            <View style={styles.homeIcon}>
              <Ionicons name="home" size={16} color={colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{address ? address.label : 'Add delivery address'}</Text>
              {address ? (
                <>
                  <Text style={styles.cardMeta}>
                    {address.recipientName || 'Recipient missing'} · {address.phone || 'Phone missing'}
                  </Text>
                  <Text style={styles.cardMeta}>{address.line}</Text>
                  {!addressReady ? (
                    <Text style={styles.warn}>
                      Incomplete — tap to complete {missingAddressFields(address).join(', ')}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.cardMeta}>Required for home delivery</Text>
              )}
            </View>
            <Text style={styles.change}>
              {!address ? 'Add' : addressReady ? 'Change' : 'Complete'}
            </Text>
          </Pressable>
        )}

        {!isPickup && addressReady ? (
          <>
            <Text style={styles.section}>Nearby pharmacies that can deliver</Text>
            {nearbyStatus === 'loading' ? <Text style={styles.cardMeta}>Checking coverage…</Text> : null}
            {nearbyStatus === 'unavailable' ? (
              <Text style={styles.warn}>{nearbyMessage || 'No pharmacies deliver to this address.'}</Text>
            ) : null}
            {nearbyStatus === 'error' ? (
              <Text style={styles.warn}>{nearbyMessage || 'Coverage check failed.'}</Text>
            ) : null}
            {nearbyStatus === 'ready' && nearbyMessage ? <Text style={styles.cardMeta}>{nearbyMessage}</Text> : null}
            {nearbyStores.map((store) => {
              const isSelected = store.id === selectedStoreId;
              const selectedNearby = nearbyStores.find((row) => row.id === selectedStoreId);
              // Only hint "in stock here" when the currently selected store is missing
              // items that this pharmacy actually has — not on every fulfillable card.
              const rescuedItems =
                !isSelected && selectedNearby
                  ? store.availability.filter(
                      (item) =>
                        item.available &&
                        selectedNearby.availability.some(
                          (row) => row.sku === item.sku && !row.available,
                        ),
                    )
                  : [];
              const missingHere = isSelected
                ? store.availability.filter((item) => !item.available)
                : [];

              return (
                <Pressable
                  key={store.id}
                  onPress={() => setSelectedStoreId(store.id)}
                  style={[
                    styles.card,
                    shadows.soft,
                    { flexDirection: 'column', alignItems: 'stretch' },
                    isSelected && styles.storeSelected,
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{store.name}</Text>
                    <Text style={styles.change}>
                      {isSelected
                        ? 'Selected'
                        : store.distanceKm != null
                          ? `${store.distanceKm} km`
                          : 'Nearby'}
                    </Text>
                  </View>
                  <Text style={styles.cardMeta}>
                    Fee {formatMoney(store.deliveryFee)} · ETA ~{store.etaMinutes} min
                    {store.openUntil ? ` · Open until ${store.openUntil}` : ''}
                  </Text>
                  {rescuedItems.map((item) => (
                    <Text key={`${store.id}-${item.sku}-stock`} style={styles.inStockHint}>
                      {item.name}: in stock at this store
                    </Text>
                  ))}
                  {missingHere.map((item) => {
                    const alt = nearbyStores.find(
                      (candidate) =>
                        candidate.id !== store.id &&
                        candidate.availability.some((row) => row.sku === item.sku && row.available),
                    );
                    return (
                      <View key={`${store.id}-${item.sku}`} style={styles.altRow}>
                        <Text style={styles.warn}>
                          {item.name}: not in stock here
                          {alt ? ` · Available at ${alt.name}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </Pressable>
              );
            })}
            {nearbyStatus === 'unavailable' || nearbyStatus === 'error' ? (
              <View style={{ gap: 8 }}>
                <PrimaryButton label="Retry coverage check" onPress={() => void refreshNearbyStores()} />
                <PrimaryButton
                  label="Change address"
                  variant="outline"
                  onPress={() => router.push('/addresses')}
                />
              </View>
            ) : null}
          </>
        ) : null}

        <Text style={styles.section}>Delivery</Text>
        <View style={styles.deliveryRow}>
          {deliveryOptions.map((option) => {
            const selected = option.id === selectedDeliveryId;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelectedDeliveryId(option.id)}
                style={[styles.deliveryCard, shadows.soft, selected && styles.deliverySelected]}
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
                  {option.id === 'pickup'
                    ? 'Free'
                    : quote && option.id === selectedDeliveryId
                      ? formatMoney(quote.deliveryCharge)
                      : quote
                        ? 'See charges'
                        : 'Calculating…'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {checkoutPlan?.split ? (
          <View style={[styles.card, shadows.soft, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <Text style={styles.cardTitle}>Split across pharmacies</Text>
            <Text style={styles.cardMeta}>{checkoutPlan.message}</Text>
            {checkoutPlan.stores.map((store) => (
              <View key={store.storeId} style={styles.splitBlock}>
                <Text style={styles.cardTitle}>{store.storeName}</Text>
                {store.items.map((item) => (
                  <Text key={item.productId} style={styles.cardMeta}>
                    {item.quantity}× {item.name} · {formatMoney(item.lineTotal)}
                  </Text>
                ))}
                <Text style={styles.cardMeta}>
                  Delivery {formatMoney(store.deliveryCharge)} · ETA ~{store.etaMinutes} min · Store total{' '}
                  {formatMoney(store.total)}
                </Text>
              </View>
            ))}
            <Text style={styles.cardTitle}>Combined {formatMoney(checkoutPlan.combinedTotal)}</Text>
            <Pressable
              onPress={() => setConfirmSplit(!confirmSplit)}
              style={[styles.confirmRow, confirmSplit && styles.confirmOn]}
            >
              <Ionicons
                name={confirmSplit ? 'checkbox' : 'square-outline'}
                size={20}
                color={confirmSplit ? colors.accentDark : colors.textSecondary}
              />
              <Text style={styles.cardMeta}>I confirm placing one order per pharmacy</Text>
            </Pressable>
          </View>
        ) : null}

        {quote?.requiresPrescription ? (
          <Text style={styles.cardMeta}>
            {prescriptionNumber
              ? `Using verified prescription ${prescriptionNumber}`
              : 'Prescription medicines need pharmacist verification before place order.'}
          </Text>
        ) : null}
        {quoteError && !checkoutPlan?.split ? <Text style={styles.warn}>{quoteError}</Text> : null}
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
          {(quote?.discount ?? 0) > 0 ? (
            <View style={styles.chargeRow}>
              <Text style={styles.cardMeta}>Discount</Text>
              <Text style={styles.cardTitle}>-{formatMoney(quote?.discount ?? 0)}</Text>
            </View>
          ) : null}
          <View style={styles.chargeRow}>
            <Text style={styles.cardTitle}>Total</Text>
            <Text style={styles.cardTitle}>{formatMoney(quote?.total ?? total)}</Text>
          </View>
        </View>

        <Text style={styles.section}>Payment</Text>
        <View style={styles.testModeBanner}>
          <Text style={styles.testModeBannerText}>TEST MODE — card payments are simulated. No real charges.</Text>
        </View>
        {paymentMethods.map((method) => {
          const selected = method.id === selectedPaymentId;
          const badge =
            method.type === 'apple_pay'
              ? 'Pay'
              : method.type === 'cod'
                ? 'COD'
                : method.type === 'credit_card'
                  ? 'CR'
                  : method.type === 'debit_card'
                    ? 'DB'
                    : 'CARD';
          return (
            <Pressable
              key={method.id}
              onPress={() => setSelectedPaymentId(method.id)}
              style={[styles.paymentCard, shadows.soft]}
            >
              <View
                style={[
                  styles.payBadge,
                  method.type === 'apple_pay'
                    ? styles.apple
                    : method.type === 'cod'
                      ? styles.cod
                      : styles.visa,
                ]}
              >
                <Text
                  style={[
                    styles.payBadgeText,
                    (method.type === 'card' ||
                      method.type === 'debit_card' ||
                      method.type === 'credit_card' ||
                      method.type === 'cod') && { color: '#1A237E' },
                  ]}
                >
                  {badge}
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
        <View style={styles.footerInfo}>
          <Text style={styles.footerMeta} numberOfLines={1}>
            {cartCount} items · {delivery?.title ?? 'Delivery'}
          </Text>
          {orderError ? <Text style={styles.warn}>{orderError}</Text> : null}
          <Text style={styles.footerTotal}>{formatMoney(quote?.total ?? total)}</Text>
        </View>
        <PrimaryButton
          label={
            processing
              ? 'Processing...'
              : cartCount === 0
                ? 'Cart is empty'
                : !isPickup && !address
                  ? 'Add address'
                  : !isPickup && !addressReady
                    ? 'Complete address'
                    : !isPickup && !quote
                      ? 'Calculating charges…'
                      : !isPickup && quoteError
                        ? 'Fix charges to continue'
                        : isPickup
                          ? 'Place pickup order'
                          : checkoutPlan?.split
                            ? 'Place split orders'
                            : isCod
                              ? 'Place COD order'
                              : isCardPayment
                                ? 'Pay with card'
                                : 'Place Order'
          }
          loading={processing}
          disabled={processing || cartCount === 0 || deliveryBlocked || Boolean(pickupBlocked)}
          onPress={onPay}
          style={styles.footerBtn}
        />
      </View>

      <CardPaymentModal
        visible={cardPayOpen}
        amount={quote?.total ?? total}
        method={cardMethod}
        methodLabel={selectedPayment?.label ?? 'Card'}
        onClose={() => setCardPayOpen(false)}
        onSuccess={onCardPaid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 24 },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm, color: colors.textSecondary, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  homeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontWeight: '700', color: colors.text },
  cardMeta: { marginTop: 2, color: colors.textSecondary, fontSize: 13 },
  change: { color: colors.accentDark, fontWeight: '700' },
  warn: { color: colors.danger, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  label: { fontWeight: '600', color: colors.text, fontSize: 13 },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.backgroundAlt,
  },
  deliveryRow: { flexDirection: 'row', gap: spacing.md },
  deliveryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  deliverySelected: { borderColor: colors.borderStrong },
  deliveryTitle: { fontWeight: '700', color: colors.text },
  free: { marginTop: 8, color: colors.accentDark, fontWeight: '700' },
  testModeBanner: {
    backgroundColor: colors.chipOrange,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  testModeBannerText: {
    color: colors.chipOrangeText,
    fontWeight: '700',
    fontSize: 12,
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
  payBadge: { minWidth: 52, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  apple: { backgroundColor: colors.primary },
  visa: { backgroundColor: '#E8EEFF' },
  cod: { backgroundColor: '#E7F6EE' },
  payBadgeText: { color: colors.primaryContrast, fontWeight: '800', fontSize: 11 },
  paymentLabel: { flex: 1, fontWeight: '600', color: colors.text },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  footerInfo: { flex: 1, minWidth: 0, flexShrink: 1, paddingRight: 4 },
  footerBtn: { flexGrow: 0, flexShrink: 0, minWidth: 152, maxWidth: 200, paddingHorizontal: 18 },
  footerMeta: { color: colors.textSecondary, fontSize: 13 },
  footerTotal: { marginTop: 2, fontSize: 24, fontWeight: '700', color: colors.text },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  altRow: { marginTop: 8, gap: 4 },
  storeSelected: { borderWidth: 1.5, borderColor: colors.borderStrong },
  inStockHint: { marginTop: 8, color: colors.accentDark, fontSize: 13, fontWeight: '600' },
  splitBlock: { paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
  },
  confirmOn: { backgroundColor: colors.accentSoft },
});
