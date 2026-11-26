import LinearGradient from 'react-native-linear-gradient';
import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radii } from '../theme';
import type { Product } from '../types';

const TONE_MAP: Record<Product['cardTone'], string> = {
  blue: '#D4F0F7',
  pink: '#F9C5D5',
  mint: '#D8F3E8',
  lavender: '#E8E4F8',
};

type Props = {
  product: Product;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function ProductVisual({ product, style, compact }: Props) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: TONE_MAP[product.cardTone] },
        compact && styles.compact,
        style,
      ]}
    >
      {product.image ? (
        <Image
          source={product.image}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}
      {!compact ? (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.0)']}
          style={styles.fade}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    minHeight: 260,
  },
  compact: {
    minHeight: 88,
    borderRadius: radii.lg,
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
});
