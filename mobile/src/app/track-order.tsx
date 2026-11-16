import { router } from '@/navigation/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderTimeline } from '@/components/OrderTimeline';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TrackingMap } from '@/components/TrackingMap';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import type { Order, OrderStatusStep } from '@/types';

const TRACK_DURATION_MS = 22000;

function buildSteps(completedCount: number): OrderStatusStep[] {
  return [
    {
      id: 'confirmed',
      title: 'Order confirmed',
      timeLabel: '9:41 AM',
      completed: completedCount >= 1,
    },
    {
      id: 'packed',
      title: 'Packed at pharmacy',
      timeLabel: '9:44 AM',
      completed: completedCount >= 2,
    },
    {
      id: 'on_way',
      title: 'On the way',
      timeLabel: 'Arriving 10:06 AM',
      completed: completedCount >= 3,
    },
    {
      id: 'delivered',
      title: 'Delivered',
      timeLabel: completedCount >= 4 ? '10:06 AM' : '—',
      completed: completedCount >= 4,
    },
  ];
}

export default function TrackOrderScreen() {
  const insets = useSafeAreaInsets();
  const { lastOrder, mobileConfig } = useApp();
  const startDistance = lastOrder?.distanceKm ?? mobileConfig.tracking.defaultDistanceKm;
  const startEta =
    lastOrder?.etaMinutes ??
    (lastOrder?.deliveryType === 'standard'
      ? mobileConfig.tracking.standardEtaMinutes
      : mobileConfig.tracking.expressEtaMinutes);

  const fallbackOrder: Order = {
    id: 'HR-20814',
    total: 80.08,
    itemCount: 3,
    deliveryType: 'express',
    paymentLabel: 'Apple Pay',
    createdAt: new Date().toISOString(),
    riderName: mobileConfig.tracking.riderName,
    etaMinutes: startEta,
    distanceKm: startDistance,
    steps: buildSteps(2),
  };
  const order = lastOrder ?? fallbackOrder;

  const progress = useSharedValue(0);
  const [distance, setDistance] = useState(startDistance);
  const [eta, setEta] = useState(startEta);
  const [completedCount, setCompletedCount] = useState(2);

  const syncUi = useCallback(
    (p: number) => {
      const nextDistance = Math.max(0.4, +(startDistance - p * Math.max(0.5, startDistance - 0.4)).toFixed(1));
      const nextEta = Math.max(5, Math.round(startEta - p * Math.max(10, startEta - 5)));
      setDistance((prev) => (prev === nextDistance ? prev : nextDistance));
      setEta((prev) => (prev === nextEta ? prev : nextEta));

      let nextCompleted = 2;
      if (p >= 0.98) nextCompleted = 4;
      else if (p >= 0.18) nextCompleted = 3;
      setCompletedCount((prev) => (prev === nextCompleted ? prev : nextCompleted));
    },
    [startDistance, startEta],
  );

  useAnimatedReaction(
    () => Math.round(progress.value * 40) / 40,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(syncUi)(current);
      }
    },
    [syncUi],
  );

  useEffect(() => {
    progress.value = 0;
    setDistance(startDistance);
    setEta(startEta);
    setCompletedCount(2);
    progress.value = withTiming(1, {
      duration: TRACK_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [progress, startDistance, startEta]);

  const steps = useMemo(() => buildSteps(completedCount), [completedCount]);
  const activeIndex = Math.min(Math.max(completedCount - 1, 0), 3);

  const etaLabel =
    completedCount >= 4 ? 'Delivered' : `Arriving in ${eta} min`;

  const onCall = () => {
    Alert.alert('Call rider', `Call ${order.riderName} (Hera Rider)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL('tel:+12125550199') },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <ScreenHeader title="Track Order" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <Animated.View entering={FadeInDown.duration(380)}>
          <TrackingMap
            progress={progress}
            distanceKm={distance}
            etaLabel={etaLabel}
            riderName={order.riderName}
            onCall={onCall}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).duration(380)}>
          <OrderTimeline steps={steps} activeIndex={activeIndex} />
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(140).duration(320)}
        style={styles.footer}
      >
        <PrimaryButton
          label="Back to Home"
          variant="outline"
          onPress={() => router.replace('/')}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
});
