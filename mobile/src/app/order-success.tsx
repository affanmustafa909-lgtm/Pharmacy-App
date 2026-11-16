import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ConfettiBurst } from '@/components/ConfettiBurst';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme';

export default function OrderSuccessScreen() {
  const { lastOrder } = useApp();
  const ring = useSharedValue(0.85);

  useEffect(() => {
    ring.value = withDelay(
      120,
      withTiming(1.15, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );

    // Video flow: celebrate, then move into live tracking
    const timer = setTimeout(() => {
      router.replace('/track-order');
    }, 2200);
    return () => clearTimeout(timer);
  }, [ring]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: 2 - ring.value,
  }));

  return (
    <View style={styles.screen}>
      <ConfettiBurst />
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View entering={ZoomIn.duration(420)} style={[styles.icon, shadows.medium]}>
          <Ionicons name="checkmark" size={42} color={colors.primaryContrast} />
        </Animated.View>
      </View>
      <Animated.Text entering={FadeIn.delay(120)} style={styles.title}>
        Order Placed!
      </Animated.Text>
      <Animated.Text entering={FadeIn.delay(200)} style={styles.subtitle}>
        Order #{lastOrder?.id ?? 'HR-20814'} · {formatMoney(lastOrder?.total ?? 80.08)} paid
        with {lastOrder?.paymentLabel ?? 'Apple Pay'}
      </Animated.Text>

      {lastOrder ? (
        <Animated.View entering={FadeInDown.delay(240)} style={styles.receipt}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Products</Text>
            <Text style={styles.receiptValue}>{formatMoney(lastOrder.productSubtotal ?? lastOrder.total)}</Text>
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
          <View style={styles.receiptRow}>
            <Text style={styles.receiptTotal}>Total</Text>
            <Text style={styles.receiptTotal}>{formatMoney(lastOrder.total)}</Text>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(280)} style={styles.actions}>
        <PrimaryButton
          label="Track Order"
          onPress={() => router.replace('/track-order')}
        />
        <PrimaryButton
          label="Back to Home"
          variant="outline"
          onPress={() => router.replace('/')}
          style={{ marginTop: 12 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E6EDF3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
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
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    marginTop: spacing.xxxl,
  },
});
