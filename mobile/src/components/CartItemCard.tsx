import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '../lib/format';
import { colors, radii, shadows, spacing } from '../theme';
import type { Product } from '../types';
import { ProductVisual } from './ProductVisual';
import { QuantityStepper } from './QuantityStepper';

type Props = {
  product: Product;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
};

export function CartItemCard({ product, quantity, onChangeQuantity }: Props) {
  return (
    <View style={[styles.card, shadows.soft]}>
      <ProductVisual product={product} compact style={styles.thumb} />
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.meta}>{product.unitLabel}</Text>
        <View style={styles.bottom}>
          <Text style={styles.price}>{formatMoney(product.price * quantity)}</Text>
          <QuantityStepper value={quantity} onChange={onChangeQuantity} min={0} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  thumb: {
    width: 88,
    minHeight: 88,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  bottom: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
});
