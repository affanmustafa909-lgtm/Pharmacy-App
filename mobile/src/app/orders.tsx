import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { buyAgain, loadMyOrders, loadReceipt } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme';

type OrderRow = Awaited<ReturnType<typeof loadMyOrders>>[number];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { selectedStoreId, replaceCart, setSelectedStoreId } = useApp();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(() => {
    setStatus('loading');
    void loadMyOrders()
      .then((next) => {
        setOrders(next);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Could not load orders');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      <ScreenHeader title="My orders" />
      <ScrollView contentContainerStyle={styles.content}>
        {message ? <Text style={styles.meta}>{message}</Text> : null}
        {status === 'loading' ? <Text style={styles.meta}>Loading…</Text> : null}
        {status === 'error' ? <Text style={styles.meta}>{error}</Text> : null}
        {status === 'ready' && orders.length === 0 ? (
          <Text style={styles.meta}>No orders yet.</Text>
        ) : null}
        {orders.map((order) => (
          <View key={order.id} style={[styles.card, shadows.soft]}>
            <Text style={styles.kicker}>{order.id}</Text>
            <Text style={styles.title}>{order.storeName}</Text>
            <Text style={styles.meta}>
              {order.status.replaceAll('_', ' ')} · {order.itemCount} items · {formatMoney(order.total)}
            </Text>
            <Text style={styles.body}>
              {order.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
            </Text>
            <View style={styles.row}>
              <Pressable
                style={styles.btn}
                onPress={() => {
                  void buyAgain(order.id, selectedStoreId || undefined).then((result) => {
                    const available = result.lines.filter((line) => line.available && line.productId);
                    if (!available.length) {
                      setMessage('None of those items are available right now.');
                      return;
                    }
                    if (result.storeId && result.storeId !== selectedStoreId) {
                      setSelectedStoreId(result.storeId);
                    }
                    replaceCart(
                      available.map((line) => ({
                        productId: line.productId!,
                        quantity: line.quantity,
                      })),
                    );
                    const blocked = result.lines.filter((line) => !line.available);
                    setMessage(
                      blocked.length
                        ? `Added ${available.length} item(s). ${blocked.length} need review.`
                        : 'Cart updated. Prices and stock rechecked.',
                    );
                    router.toCart();
                  });
                }}
              >
                <Text style={styles.btnText}>Buy again</Text>
              </Pressable>
              <Pressable
                style={styles.btnSoft}
                onPress={() => {
                  void loadReceipt(order.id).then((receipt) => {
                    void Share.share({
                      title: `Receipt ${receipt.id}`,
                      message: `Hera Pharmacy receipt ${receipt.id}\nTotal ${formatMoney(receipt.total)}\nProducts ${formatMoney(receipt.productSubtotal)}\nDelivery ${formatMoney(receipt.deliveryCharge)}\nService ${formatMoney(receipt.serviceCharge)}\nBFP ${formatMoney(receipt.bfpCharge)}`,
                    });
                  });
                }}
              >
                <Text style={styles.btnSoftText}>Download receipt</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: 6 },
  kicker: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { color: colors.textSecondary, fontSize: 13 },
  body: { color: colors.textSecondary, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: colors.primaryContrast, fontWeight: '700' },
  btnSoft: {
    flex: 1,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSoftText: { color: colors.accentDark, fontWeight: '700' },
});
