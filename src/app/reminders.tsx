import { router } from '@/navigation/router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import {
  createReminder,
  deleteReminder,
  loadReminders,
  snoozeReminder,
  toggleReminder,
  updateReminder,
} from '@/lib/api';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Reminder } from '@/types';

async function ensureNotificationPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  if (Platform.OS !== 'android') return 'granted';
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Refill reminders',
        message: 'Hera needs notification permission to remind you about refills.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const { lastOrder } = useApp();
  const [items, setItems] = useState<Reminder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [permissionNote, setPermissionNote] = useState('');
  const [medicine, setMedicine] = useState('');
  const [time, setTime] = useState('8:00 AM');
  const [frequency, setFrequency] = useState('Once daily');
  const [orderNumber, setOrderNumber] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = () => {
    setStatus('loading');
    void loadReminders()
      .then((next) => {
        setItems(next);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Could not load reminders');
      });
  };

  useEffect(() => {
    refresh();
    void ensureNotificationPermission().then((result) => {
      if (result === 'denied') {
        setPermissionNote(
          'Notifications are off. Reminders are saved, but this device will not alert you until permission is allowed in Settings.',
        );
      } else if (result === 'unavailable') {
        setPermissionNote('Notification permission is unavailable on this build. Reminders still sync to your account.');
      }
    });
  }, []);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Reminders" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.form, shadows.soft]}>
          <Text style={styles.formTitle}>{editingId ? 'Edit reminder' : 'New refill reminder'}</Text>
          <TextInput
            style={styles.input}
            value={medicine}
            onChangeText={setMedicine}
            placeholder="Medicine name"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="Time"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={frequency}
            onChangeText={setFrequency}
            placeholder="Frequency"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={orderNumber}
            onChangeText={setOrderNumber}
            placeholder="Link past order # (optional)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />
          {lastOrder?.id && !editingId ? (
            <Pressable onPress={() => setOrderNumber(lastOrder.id)}>
              <Text style={styles.link}>Use last order {lastOrder.id}</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.saveBtn}
            onPress={() => {
              if (!medicine.trim()) {
                setError('Enter a medicine name.');
                return;
              }
              void (async () => {
                const permission = await ensureNotificationPermission();
                if (permission === 'denied') {
                  setPermissionNote(
                    'Notifications denied. Reminder will still be saved to your account.',
                  );
                }
                const payload = {
                  medicine: medicine.trim(),
                  time: time.trim() || '8:00 AM',
                  frequency: frequency.trim() || 'Once daily',
                  orderNumber: orderNumber.trim() || undefined,
                  productId: lastOrder?.items?.[0]?.productId || undefined,
                };
                try {
                  if (editingId) await updateReminder(editingId, payload);
                  else await createReminder(payload);
                  setMedicine('');
                  setOrderNumber('');
                  setEditingId(null);
                  setError('');
                  refresh();
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : 'Could not save reminder');
                }
              })();
            }}
          >
            <Text style={styles.saveText}>{editingId ? 'Save changes' : 'Add reminder'}</Text>
          </Pressable>
        </View>

        {permissionNote ? <Text style={styles.warn}>{permissionNote}</Text> : null}
        {status === 'loading' ? <ActivityIndicator color={colors.accent} /> : null}
        {status === 'error' || error ? <Text style={styles.meta}>{error}</Text> : null}
        {status === 'error' ? (
          <Pressable onPress={refresh}>
            <Text style={styles.link}>Retry</Text>
          </Pressable>
        ) : null}
        {status === 'ready' && items.length === 0 ? (
          <Text style={styles.meta}>No reminders yet.</Text>
        ) : null}
        {items.map((item) => (
          <View key={item.id} style={[styles.card, shadows.soft]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.medicine}</Text>
              <Text style={styles.meta}>
                {item.time} · {item.frequency}
                {item.snoozedUntil ? ` · snoozed until ${new Date(item.snoozedUntil).toLocaleString()}` : ''}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    setEditingId(item.id);
                    setMedicine(item.medicine);
                    setTime(item.time);
                    setFrequency(item.frequency);
                    setOrderNumber(item.orderNumber ?? '');
                  }}
                >
                  <Text style={styles.link}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void snoozeReminder(item.id, 4)
                      .then(refresh)
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : 'Could not snooze'),
                      );
                  }}
                >
                  <Text style={styles.link}>Snooze 4h</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void updateReminder(item.id, { enabled: false })
                      .then(refresh)
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : 'Could not disable'),
                      );
                  }}
                >
                  <Text style={styles.link}>Disable</Text>
                </Pressable>
                {item.productId ? (
                  <Pressable onPress={() => router.push(`/product/${item.productId}`)}>
                    <Text style={styles.link}>Open product</Text>
                  </Pressable>
                ) : null}
                {item.orderNumber ? (
                  <Pressable onPress={() => router.push('/orders')}>
                    <Text style={styles.link}>Past order</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    void deleteReminder(item.id).then(refresh);
                  }}
                >
                  <Text style={[styles.link, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
            <Switch
              value={item.enabled}
              onValueChange={() => {
                void toggleReminder(item.id)
                  .then((updated) => {
                    setItems((prev) =>
                      prev.map((reminder) =>
                        reminder.id === item.id ? { ...reminder, enabled: updated.enabled } : reminder,
                      ),
                    );
                  })
                  .catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : 'Could not update the reminder'),
                  );
              }}
              trackColor={{ true: colors.accent, false: '#D1D1D6' }}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: 40 },
  form: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: 10 },
  formTitle: { fontWeight: '700', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: colors.primaryContrast, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: 12,
  },
  name: { fontWeight: '700', color: colors.text, fontSize: 16 },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  warn: { color: colors.danger, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  link: { color: colors.accentDark, fontWeight: '700', fontSize: 12 },
});
