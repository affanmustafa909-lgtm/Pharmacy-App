import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing } from '../theme';
import type { OrderStatusStep } from '../types';

type Props = {
  steps: OrderStatusStep[];
  activeIndex: number;
};

function StepDot({
  completed,
  active,
}: {
  completed: boolean;
  active: boolean;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      pulse.value = 0;
    }
  }, [active, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.18 + pulse.value * 0.28 : 0,
    transform: [{ scale: active ? 1 + pulse.value * 0.35 : 1 }],
  }));

  return (
    <View style={styles.dotWrap}>
      {active ? <Animated.View style={[styles.halo, haloStyle]} /> : null}
      <View style={[styles.dot, completed || active ? styles.dotDone : styles.dotTodo]}>
        {completed || active ? (
          <Ionicons name="checkmark" size={12} color={colors.primaryContrast} />
        ) : null}
      </View>
    </View>
  );
}

export function OrderTimeline({ steps, activeIndex }: Props) {
  return (
    <View style={[styles.card, shadows.soft]}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const completed = step.completed;
        const active = index === activeIndex && !steps[steps.length - 1]?.completed;
        const lineActive = completed && (isLast || steps[index + 1]?.completed || index < activeIndex);

        return (
          <Animated.View
            key={step.id}
            entering={FadeIn.delay(80 + index * 60).duration(280)}
            style={styles.row}
          >
            <View style={styles.rail}>
              <StepDot completed={completed} active={active} />
              {!isLast ? (
                <View style={[styles.line, lineActive ? styles.lineActive : null]} />
              ) : null}
            </View>
            <View style={[styles.content, isLast && styles.contentLast]}>
              <Text
                style={[
                  styles.title,
                  !completed && !active && styles.muted,
                ]}
              >
                {step.title}
              </Text>
              <Text style={styles.time}>{step.timeLabel}</Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    minHeight: 64,
  },
  rail: {
    width: 28,
    alignItems: 'center',
  },
  dotWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotDone: {
    backgroundColor: colors.accent,
  },
  dotTodo: {
    backgroundColor: '#E5E5E5',
  },
  line: {
    width: 2,
    flexGrow: 1,
    minHeight: 34,
    backgroundColor: '#E5E5E5',
    marginTop: 2,
    marginBottom: 2,
  },
  lineActive: {
    backgroundColor: colors.accent,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: 2,
  },
  contentLast: {
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  muted: {
    color: colors.textSecondary,
  },
  time: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
