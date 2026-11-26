import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Haptics } from '@/lib/haptics';
import { router } from '@/navigation/router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { useApp } from '../context/AppContext';
import { formatMoney } from '../lib/format';
import { colors, radii, shadows } from '../theme';
import type { Product } from '../types';

const TONE_MAP: Record<Product['cardTone'], string> = {
  blue: '#D4F0F7',
  pink: '#F9C5D5',
  mint: '#D8F3E8',
  lavender: '#E8E4F8',
};

type Props = {
  product: Product;
  width?: number;
};

export function ProductCard({ product, width = 270 }: Props) {
  const { favorites, cart, addToCart, toggleFavorite } = useApp();
  const liked = favorites.includes(product.id);
  const inCart = cart.some((item) => item.productId === product.id);
  const addScale = useSharedValue(1);
  const addStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.id}`)}
      style={[
        styles.card,
        shadows.soft,
        { width, backgroundColor: TONE_MAP[product.cardTone] },
      ]}
    >
      {/* Picture fills the whole card */}
      {product.image ? <Image source={product.image} style={styles.image} resizeMode="cover" /> : null}

      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.92)']}
        locations={[0.45, 0.72, 1]}
        style={styles.fade}
      />

      <Pressable
        onPress={() => {
          void toggleFavorite(product.id).catch(() => undefined);
        }}
        style={[styles.heart, shadows.soft]}
        hitSlop={8}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={18}
          color={liked ? '#E91E63' : colors.text}
        />
      </Pressable>

      {/* Name + price written on the card */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatMoney(product.price)}</Text>
      </View>

      <Pressable
        onPress={() => {
          addToCart(product.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          addScale.value = withSequence(
            withSpring(0.85, { damping: 12 }),
            withSpring(1, { damping: 10 }),
          );
        }}
        hitSlop={8}
        style={styles.addHit}
      >
        <Animated.View
          style={[styles.add, inCart && styles.added, shadows.soft, addStyle]}
        >
          <Ionicons
            name={inCart ? 'checkmark' : 'add'}
            size={18}
            color={colors.primaryContrast}
          />
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 340,
    borderRadius: radii.xl,
    marginRight: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  fade: {
    ...StyleSheet.absoluteFill,
  },
  heart: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  info: {
    position: 'absolute',
    left: 16,
    right: 64,
    bottom: 16,
    zIndex: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  price: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  addHit: {
    position: 'absolute',
    right: 14,
    bottom: 16,
    zIndex: 3,
  },
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  added: {
    backgroundColor: colors.accent,
  },
});
