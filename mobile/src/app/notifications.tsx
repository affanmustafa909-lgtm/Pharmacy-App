import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { loadNotifications, markNotificationsRead } from '@/lib/api';
import type { AppNotification } from '@/types';
import { colors, radii, shadows, spacing } from '@/theme';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    setStatus('loading');
    void loadNotifications()
      .then((payload) => {
        setItems(payload.notifications);
        setUnreadCount(payload.unreadCount);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Could not load notifications');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      <ScreenHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => {
                void markNotificationsRead(undefined, true).then(refresh);
              }}
            >
              <Text style={styles.mark}>Mark all read</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {status === 'loading' ? <Text style={styles.meta}>Loading…</Text> : null}
        {status === 'error' ? <Text style={styles.meta}>{error}</Text> : null}
        {status === 'ready' && items.length === 0 ? (
          <Text style={styles.meta}>No notifications yet.</Text>
        ) : null}
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.card, shadows.soft, !item.read && styles.unread]}
            onPress={() => {
              void markNotificationsRead([item.id]).then(refresh);
              const data = item.data || {};
              if (typeof data.orderNumber === 'string') router.push('/orders');
              else if (typeof data.prescriptionNumber === 'string') router.push('/prescriptions');
              else if (typeof data.productId === 'string') router.push(`/product/${data.productId}`);
              else if (item.type === 'refill') router.push('/reminders');
            }}
          >
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: 12, paddingBottom: 40 },
  mark: { color: colors.accentDark, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: 4 },
  unread: { borderWidth: 1, borderColor: colors.accent },
  type: { fontSize: 11, fontWeight: '700', color: colors.accentDark, textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { color: colors.textSecondary, lineHeight: 20 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
