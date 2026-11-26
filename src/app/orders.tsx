import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { buyAgain, loadMyOrders } from '@/lib/api';
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
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const onBuyAgain = async (order: OrderRow) => {
    setBusyId(order.id);
    setMessage('');
    setError('');
    try {
      const result = await buyAgain(order.id, selectedStoreId || undefined);
      const available = result.lines.filter((line) => line.available && line.productId);
      const blocked = result.lines.filter((line) => !line.available);
      if (!available.length) {
        setMessage(
          blocked.length
            ? `Unavailable: ${blocked.map((line) => `${line.name}${line.reason ? ` (${line.reason})` : ''}`).join(', ')}`
            : 'None of those items are available right now.',
        );
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
      const rxNote = available.some((line) => line.rxRequired)
        ? ' Some items need a prescription before checkout.'
        : '';
      setMessage(
        blocked.length
          ? `Added ${available.length} item(s). Unavailable: ${blocked
              .map((line) => `${line.name}${line.reason ? ` (${line.reason})` : ''}`)
              .join(', ')}.${rxNote}`
          : `Cart updated with current prices and stock.${rxNote}`,
      );
      router.toCart();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not buy again');
    } finally {
      setBusyId(null);
    }
  };

  const openReceipt = (orderId: string) => {
    router.push(`/receipt?orderId=${encodeURIComponent(orderId)}`);
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      <ScreenHeader title="My orders" />
      <ScrollView contentContainerStyle={styles.content}>
        {message ? <Text style={styles.ok}>{message}</Text> : null}
        {status === 'loading' ? <ActivityIndicator color={colors.accent} /> : null}
        {status === 'error' || error ? <Text style={styles.meta}>{error || 'Could not load orders'}</Text> : null}
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
                disabled={busyId === order.id}
                onPress={() => router.push(`/track-order?orderId=${encodeURIComponent(order.id)}`)}
              >
                <Text style={styles.btnText}>Track</Text>
              </Pressable>
              <Pressable
                style={styles.btnSoft}
                disabled={busyId === order.id}
                onPress={() => void onBuyAgain(order)}
              >
                <Text style={styles.btnSoftText}>{busyId === order.id ? 'Checking…' : 'Buy again'}</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Pressable style={styles.btnSoft} onPress={() => openReceipt(order.id)}>
                <Text style={styles.btnSoftText}>View receipt</Text>
              </Pressable>
            </View>
            <Pressable style={styles.linkBtn} onPress={() => openReceipt(order.id)}>
              <Text style={styles.linkText}>Open designed receipt</Text>
            </Pressable>
          </View>
        ))}
        {status === 'error' ? (
          <Pressable onPress={refresh}>
            <Text style={styles.linkText}>Retry</Text>
          </Pressable>
        ) : null}
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
  ok: { color: colors.accentDark, fontSize: 13, fontWeight: '600' },
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
  linkBtn: { marginTop: 4 },
  linkText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
});
