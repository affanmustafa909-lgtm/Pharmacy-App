import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfettiBurst } from '@/components/ConfettiBurst';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme';

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { lastOrder } = useApp();
  const ring = useSharedValue(0.85);

  useEffect(() => {
    ring.value = withDelay(
      120,
      withTiming(1.15, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [ring]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: Math.max(0, 2 - ring.value),
  }));

  if (!lastOrder) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.content}>
          <Text style={styles.title}>Order unavailable</Text>
          <Text style={styles.subtitle}>Open My orders to view recent purchases.</Text>
          <PrimaryButton label="View orders" onPress={() => router.replace('/orders')} />
          <PrimaryButton
            label="Back to Home"
            variant="outline"
            onPress={() => router.replace('/')}
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    );
  }

  const orderId = lastOrder.id;
  const total = lastOrder.total;
  const payment = lastOrder.paymentLabel;
  const paymentStatus = lastOrder.paymentStatus ?? 'paid';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <ConfettiBurst />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View
            entering={ZoomIn.duration(420).reduceMotion(ReduceMotion.Never)}
            style={[styles.icon, shadows.medium]}
          >
            <Ionicons name="checkmark" size={42} color={colors.primaryContrast} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.delay(120).reduceMotion(ReduceMotion.Never)}>
          <Text style={styles.title}>Order Placed!</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(200).reduceMotion(ReduceMotion.Never)}>
          <Text style={styles.subtitle}>
            Order #{orderId} · {formatMoney(total)} · {payment} ({paymentStatus})
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(240).reduceMotion(ReduceMotion.Never)}
          style={styles.receipt}
        >
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Order ID</Text>
            <Text style={styles.receiptValue}>{orderId}</Text>
          </View>
          {lastOrder.transactionId ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Transaction</Text>
              <Text style={styles.receiptValue}>{lastOrder.transactionId}</Text>
            </View>
          ) : null}
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment method</Text>
            <Text style={styles.receiptValue}>{payment}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Date</Text>
            <Text style={styles.receiptValue}>{new Date(lastOrder.createdAt).toLocaleString()}</Text>
          </View>
          {lastOrder.storeName ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Store</Text>
              <Text style={styles.receiptValue}>{lastOrder.storeName}</Text>
            </View>
          ) : null}
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>
              {lastOrder.deliveryType === 'pickup' ? 'Pickup' : 'Deliver to'}
            </Text>
            <Text style={[styles.receiptValue, { flex: 1, textAlign: 'right' }]}>
              {lastOrder.addressLine || lastOrder.storeAddress || '—'}
            </Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Products</Text>
            <Text style={styles.receiptValue}>
              {formatMoney(lastOrder.productSubtotal ?? total)}
            </Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Delivery</Text>
            <Text style={styles.receiptValue}>{formatMoney(lastOrder.deliveryCharge ?? 0)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Service</Text>
            <Text style={styles.receiptValue}>{formatMoney(lastOrder.serviceCharge ?? 0)}</Text>
          </View>
          {(lastOrder.bfpCharge ?? 0) > 0 ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>BFP</Text>
              <Text style={styles.receiptValue}>{formatMoney(lastOrder.bfpCharge ?? 0)}</Text>
            </View>
          ) : null}
          {(lastOrder.discount ?? 0) > 0 ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Discount</Text>
              <Text style={styles.receiptValue}>-{formatMoney(lastOrder.discount ?? 0)}</Text>
            </View>
          ) : null}
          <View style={[styles.receiptRow, styles.receiptTotalRow]}>
            <Text style={styles.receiptTotal}>Total</Text>
            <Text style={styles.receiptTotal}>{formatMoney(total)}</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(280).reduceMotion(ReduceMotion.Never)}
          style={styles.actions}
        >
          <PrimaryButton
            label="Track Order"
            onPress={() => router.replace(`/track-order?orderId=${encodeURIComponent(orderId)}`)}
          />
          <PrimaryButton
            label="View receipt"
            variant="outline"
            onPress={() =>
              router.replace(`/receipt?orderId=${encodeURIComponent(orderId)}`)
            }
            style={{ marginTop: 12 }}
          />
          <PrimaryButton
            label="Back to Home"
            variant="outline"
            onPress={() => router.replace('/')}
            style={{ marginTop: 12 }}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E6EDF3',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: 24,
  },
  iconWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  ring: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  receipt: {
    width: '100%',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  receiptTotalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  receiptLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  receiptValue: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  receiptTotal: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  actions: {
    width: '100%',
    marginTop: spacing.xxxl,
  },
});
