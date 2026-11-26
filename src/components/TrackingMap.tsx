import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors, radii, shadows } from '../theme';

const ROUTE = [
  { x: 0.12, y: 0.72 },
  { x: 0.28, y: 0.58 },
  { x: 0.46, y: 0.48 },
  { x: 0.62, y: 0.36 },
  { x: 0.78, y: 0.28 },
  { x: 0.88, y: 0.22 },
];

type Props = {
  progress: SharedValue<number>;
  distanceKm: number;
  etaLabel: string;
  riderName: string;
  onCall: () => void;
};

function routePath(w: number, h: number) {
  return ROUTE.map((p, i) => {
    const x = p.x * w;
    const y = p.y * h;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}

export function TrackingMap({
  progress,
  distanceKm,
  etaLabel,
  riderName,
  onCall,
}: Props) {
  const [size, setSize] = React.useState({ w: 320, h: 280 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ w: width, h: height });
    }
  };

  const pathD = useMemo(() => routePath(size.w, size.h), [size.h, size.w]);

  const pinStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const seg = Math.min(ROUTE.length - 2, Math.floor(t * (ROUTE.length - 1)));
    const local = t * (ROUTE.length - 1) - seg;
    const a = ROUTE[seg];
    const b = ROUTE[seg + 1];
    const x = interpolate(local, [0, 1], [a.x * size.w, b.x * size.w], Extrapolation.CLAMP);
    const y = interpolate(local, [0, 1], [a.y * size.h, b.y * size.h], Extrapolation.CLAMP);
    const angle =
      (Math.atan2(b.y * size.h - a.y * size.h, b.x * size.w - a.x * size.w) * 180) /
      Math.PI;

    return {
      transform: [
        { translateX: x - 16 },
        { translateY: y - 16 },
        { rotate: `${angle + 90}deg` },
      ],
    };
  });

  return (
    <View style={[styles.card, shadows.soft]}>
      <View style={styles.map} onLayout={onLayout}>
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="#E8E2D6" />
          {/* Street grid */}
          {Array.from({ length: 7 }).map((_, i) => (
            <Rect
              key={`h-${i}`}
              x={0}
              y={(size.h / 7) * i + 18}
              width={size.w}
              height={10}
              fill="#F4F0E8"
              opacity={0.95}
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <Rect
              key={`v-${i}`}
              x={(size.w / 5) * i + 24}
              y={0}
              width={10}
              height={size.h}
              fill="#F4F0E8"
              opacity={0.95}
            />
          ))}
          {/* Blocks */}
          <Rect x={size.w * 0.08} y={size.h * 0.12} width={58} height={42} rx={6} fill="#D9D2C5" />
          <Rect x={size.w * 0.42} y={size.h * 0.18} width={70} height={48} rx={6} fill="#D9D2C5" />
          <Rect x={size.w * 0.72} y={size.h * 0.4} width={52} height={60} rx={6} fill="#D9D2C5" />
          <Rect x={size.w * 0.18} y={size.h * 0.55} width={64} height={36} rx={6} fill="#D5CEC0" />
          <SvgText
            x={size.w * 0.34}
            y={size.h * 0.4}
            fill="#9A9286"
            fontSize="10"
            fontWeight="600"
          >
            E 34th St
          </SvgText>
          <SvgText
            x={size.w * 0.58}
            y={size.h * 0.62}
            fill="#9A9286"
            fontSize="10"
            fontWeight="600"
          >
            2nd Ave
          </SvgText>
          {/* Route */}
          <Path
            d={pathD}
            stroke={colors.accent}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.95}
          />
          {/* Destination */}
          <Circle
            cx={ROUTE[ROUTE.length - 1].x * size.w}
            cy={ROUTE[ROUTE.length - 1].y * size.h}
            r={7}
            fill="#FFFFFF"
            stroke={colors.accent}
            strokeWidth={3}
          />
        </Svg>

        <Animated.View style={[styles.riderPin, pinStyle]}>
          <Ionicons name="navigate" size={14} color="#FFFFFF" />
        </Animated.View>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{distanceKm.toFixed(1)} km · Live</Text>
        </View>

        <Pressable style={[styles.compass, shadows.soft]}>
          <Ionicons name="locate-outline" size={18} color={colors.text} />
        </Pressable>

        <View style={styles.riderBarWrap}>
          {Platform.OS === 'ios' ? (
            <BlurView blurType="light" blurAmount={20} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.riderBarAndroid]} />
          )}
          <View style={styles.riderBar}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderInitial}>A</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>{riderName} · Hera Rider</Text>
              <Text style={styles.riderEta}>{etaLabel}</Text>
            </View>
            <Pressable onPress={onCall} style={styles.call} hitSlop={8}>
              <Ionicons name="call" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  map: {
    height: 300,
    backgroundColor: '#E8E2D6',
    position: 'relative',
  },
  riderPin: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    zIndex: 5,
  },
  liveBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  compass: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderBarWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: 7,
  },
  riderBarAndroid: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  riderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  riderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInitial: {
    fontWeight: '700',
    color: colors.accentDark,
  },
  riderName: {
    fontWeight: '700',
    color: colors.text,
  },
  riderEta: {
    marginTop: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  call: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
