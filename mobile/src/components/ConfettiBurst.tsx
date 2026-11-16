import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const PIECES = [
  { color: '#7C3AED', x: -70, y: -40, rotate: 40, delay: 0 },
  { color: '#F59E0B', x: 80, y: -55, rotate: -30, delay: 40 },
  { color: '#111111', x: -30, y: -80, rotate: 15, delay: 80 },
  { color: '#EC4899', x: 55, y: -20, rotate: 55, delay: 120 },
  { color: '#2DB8A8', x: -90, y: 10, rotate: -50, delay: 60 },
  { color: '#60A5FA', x: 95, y: 15, rotate: 20, delay: 100 },
  { color: '#F472B6', x: 10, y: -95, rotate: -10, delay: 20 },
  { color: '#34D399', x: -50, y: 40, rotate: 70, delay: 140 },
];

function Piece({
  color,
  x,
  y,
  rotate,
  delay,
}: {
  color: string;
  x: number;
  y: number;
  rotate: number;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.15,
    transform: [
      { translateX: x * progress.value },
      { translateY: y * progress.value },
      { rotate: `${rotate * progress.value}deg` },
      { scale: 0.4 + progress.value * 0.8 },
    ],
  }));

  return <Animated.View style={[styles.piece, { backgroundColor: color }, style]} />;
}

export function ConfettiBurst() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      {PIECES.map((piece, index) => (
        <Piece key={index} {...piece} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    position: 'absolute',
    width: 10,
    height: 18,
    borderRadius: 3,
  },
});
