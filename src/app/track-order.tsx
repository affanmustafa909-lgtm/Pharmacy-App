import { router } from '@/navigation/router';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderTimeline } from '@/components/OrderTimeline';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TrackingMap } from '@/components/TrackingMap';
import { useApp } from '@/context/AppContext';
import { loadOrderByNumber } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Order, OrderStatusStep } from '@/types';

function toOrder(detail: Awaited<ReturnType<typeof loadOrderByNumber>>): Order {
  return {
    id: detail.id,
    total: detail.total,
    itemCount: detail.itemCount,
    deliveryType: detail.deliveryType,
    paymentLabel: detail.paymentLabel,
    paymentStatus: (detail.paymentStatus as 'paid' | 'unpaid') || 'paid',
    createdAt: detail.createdAt,
    status: detail.status,
    storeName: detail.storeName,
    storeAddress: detail.storeAddress,
    openUntil: detail.openUntil,
    addressLine: detail.addressLine,
    riderName: detail.riderName ?? null,
    riderPhone: detail.riderPhone ?? null,
    waitingForRider: detail.waitingForRider ?? (!detail.riderName && detail.deliveryType !== 'pickup'),
    etaMinutes: 0,
    distanceKm: detail.deliveryDistanceKm ?? 0,
    productSubtotal: detail.productSubtotal,
    deliveryCharge: detail.deliveryCharge,
    serviceCharge: detail.serviceCharge,
    bfpCharge: detail.bfpCharge,
    discount: detail.discount,
    items: detail.items,
    steps: detail.steps.map(
      (step): OrderStatusStep => ({
        id: step.id,
        title: step.title,
        completed: step.completed,
        timeLabel: step.timeLabel || (step.completed ? 'Done' : '—'),
      }),
    ),
  };
}

export default function TrackOrderScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'TrackOrder'>>();
  const { lastOrder, mobileConfig } = useApp();
  const orderId = route.params?.orderId || lastOrder?.id || '';
  const [order, setOrder] = useState<Order | null>(lastOrder?.id === orderId ? lastOrder : null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError('No order selected.');
      return;
    }
    try {
      const detail = await loadOrderByNumber(orderId);
      setOrder(toOrder(detail));
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load tracking');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, 12000);
    return () => clearInterval(id);
  }, [refresh]);

  const isPickup = order?.deliveryType === 'pickup';
  const waitingForRider = Boolean(order?.waitingForRider);
  const riderPhone = order?.riderPhone?.trim() || '';
  const mapProgress = useSharedValue(
    order?.status === 'delivered' ? 1 : order?.status === 'out_for_delivery' ? 0.65 : 0.2,
  );

  useEffect(() => {
    mapProgress.value =
      order?.status === 'delivered' ? 1 : order?.status === 'out_for_delivery' ? 0.65 : 0.2;
  }, [order?.status, mapProgress]);

  const callRider = () => {
    if (!riderPhone) {
      Alert.alert('Rider not assigned', 'Waiting for rider assignment.');
      return;
    }
    void Linking.openURL(`tel:${riderPhone}`);
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScreenHeader title="Track order" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !order ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : null}
        {error ? <Text style={styles.warn}>{error}</Text> : null}
        {order ? (
          <>
            <View style={[styles.card, shadows.soft]}>
              <Text style={styles.title}>Order #{order.id}</Text>
              <Text style={styles.meta}>
                {order.storeName || 'Pharmacy'} · {formatMoney(order.total)} ·{' '}
                {order.paymentLabel} ({order.paymentStatus ?? 'paid'})
              </Text>
              <Text style={styles.meta}>
                {isPickup ? 'Pickup' : 'Deliver to'}: {order.addressLine || order.storeAddress || '—'}
              </Text>
              <Text style={styles.meta}>Status: {order.status || 'placed'}</Text>
            </View>

            {!isPickup ? (
              waitingForRider ? (
                <View style={[styles.card, shadows.soft]}>
                  <Text style={styles.title}>Waiting for rider assignment</Text>
                  <Text style={styles.meta}>
                    Your pharmacy will assign a rider soon. Tracking map unlocks after assignment.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.card, shadows.soft]}>
                    <Text style={styles.title}>{order.riderName || 'Rider'}</Text>
                    <Text style={styles.meta}>{riderPhone || 'Phone on file after assignment'}</Text>
                  </View>
                  <TrackingMap
                    progress={mapProgress}
                    distanceKm={order.distanceKm || mobileConfig.tracking.defaultDistanceKm}
                    etaLabel={`ETA ~${order.etaMinutes || mobileConfig.tracking.expressEtaMinutes} min`}
                    riderName={order.riderName || 'Rider'}
                    onCall={callRider}
                  />
                </>
              )
            ) : (
              <View style={[styles.card, shadows.soft]}>
                <Text style={styles.title}>Store pickup</Text>
                <Text style={styles.meta}>{order.storeAddress || order.addressLine}</Text>
                {order.openUntil ? <Text style={styles.meta}>Open until {order.openUntil}</Text> : null}
              </View>
            )}

            <OrderTimeline
              steps={order.steps}
              activeIndex={Math.max(
                0,
                order.steps.findIndex((step) => !step.completed),
              )}
            />

            <View style={[styles.card, shadows.soft, { flexDirection: 'column', gap: 6 }]}>
              <Text style={styles.title}>Breakdown</Text>
              <Text style={styles.meta}>Products {formatMoney(order.productSubtotal ?? 0)}</Text>
              <Text style={styles.meta}>Delivery {formatMoney(order.deliveryCharge ?? 0)}</Text>
              <Text style={styles.meta}>Service {formatMoney(order.serviceCharge ?? 0)}</Text>
              {(order.bfpCharge ?? 0) > 0 ? (
                <Text style={styles.meta}>BFP {formatMoney(order.bfpCharge ?? 0)}</Text>
              ) : null}
              <Text style={styles.title}>Total {formatMoney(order.total)}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {!isPickup ? (
          <PrimaryButton
            label={waitingForRider ? 'Waiting for rider' : 'Call Rider'}
            onPress={callRider}
            disabled={waitingForRider || !riderPhone}
            style={{ flex: 1 }}
          />
        ) : (
          <PrimaryButton label="View orders" onPress={() => router.replace('/orders')} style={{ flex: 1 }} />
        )}
        <PrimaryButton
          label="Refresh"
          variant="outline"
          onPress={() => {
            setLoading(true);
            void refresh();
          }}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  title: { fontWeight: '700', color: colors.text, fontSize: 16 },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  warn: { color: colors.danger, fontWeight: '600', marginTop: 12 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
