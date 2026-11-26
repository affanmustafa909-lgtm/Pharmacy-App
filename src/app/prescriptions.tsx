import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { API_BASE, loadPrescriptions, replacePrescriptionImage } from '@/lib/api';
import type { Prescription } from '@/types';
import { colors, radii, shadows, spacing } from '@/theme';

function statusLabel(status: string) {
  if (status === 'pending') return 'Pending Review';
  if (status === 'needs_clearer_photo') return 'Needs Clearer Photo';
  if (status === 'approved') return 'Available';
  if (status === 'rejected') return 'Unavailable';
  if (status === 'dispensed') return 'Resolved';
  return status;
}

export default function PrescriptionsScreen() {
  const insets = useSafeAreaInsets();
  const { setPrescriptionNumber } = useApp();
  const [items, setItems] = useState<Prescription[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const refresh = useCallback(() => {
    setStatus('loading');
    void loadPrescriptions()
      .then((next) => {
        setItems(next);
        setStatus('ready');
        const verified = next.find((item) => item.status === 'approved');
        setPrescriptionNumber(verified?.number ?? null);
      })
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Could not load requests');
      });
  }, [setPrescriptionNumber]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      <ScreenHeader title="My Requests" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={[styles.talkBtn, shadows.soft]} onPress={() => router.push('/scan')}>
          <Ionicons name="camera-outline" size={18} color={colors.accentDark} />
          <Text style={styles.talkText}>New photo request</Text>
        </Pressable>
        {status === 'loading' ? <Text style={styles.meta}>Loading…</Text> : null}
        {status === 'error' ? <Text style={styles.meta}>{error}</Text> : null}
        {status === 'ready' && items.length === 0 ? (
          <Text style={styles.meta}>No photo requests yet. Scan packaging or a prescription to start.</Text>
        ) : null}
        {items.map((item) => {
          const imageUri = item.imageUrl
            ? item.imageUrl.startsWith('http')
              ? item.imageUrl
              : `${API_BASE}${item.imageUrl}`
            : '';
          const detected = item.detectedDetails;
          return (
            <View key={item.number} style={[styles.card, shadows.soft]}>
              <Text style={styles.kicker}>
                {item.number} · {item.uploadType === 'medicine_packaging' ? 'Packaging' : 'Prescription'}
              </Text>
              <Text style={styles.title}>{item.medicineName || 'Awaiting review'}</Text>
              <Text style={styles.meta}>
                {statusLabel(item.status)} · {item.storeName}
              </Text>
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}
              {item.imageReadable === false || item.status === 'needs_clearer_photo' ? (
                <Text style={styles.warn}>This photo is unclear. Replace it on this same request.</Text>
              ) : null}
              {detected?.name ? (
                <>
                  <Text style={styles.section}>Detected details</Text>
                  <Text style={styles.body}>
                    {[detected.name, detected.strength, detected.form, detected.packSize].filter(Boolean).join(' · ')}
                  </Text>
                </>
              ) : null}
              {item.customerNote ? (
                <>
                  <Text style={styles.section}>Your message</Text>
                  <Text style={styles.body}>{item.customerNote}</Text>
                </>
              ) : null}
              <Text style={styles.section}>Pharmacist reply</Text>
              <Text style={styles.body}>{item.notes || 'No reply yet'}</Text>
              <Text style={styles.section}>Linked product</Text>
              <Text style={styles.body}>
                {item.verifiedItems?.length
                  ? item.verifiedItems
                      .map((entry) =>
                        [entry.name, entry.strength, entry.quantity || entry.approvedQty].filter(Boolean).join(' · '),
                      )
                      .join('\n')
                  : 'Not linked yet'}
              </Text>
              {item.status === 'needs_clearer_photo' || item.imageReadable === false ? (
                <Pressable
                  style={styles.replaceBtn}
                  disabled={busyId === item.number}
                  onPress={() => {
                    void launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }).then((result) => {
                      const asset = result.assets?.[0];
                      if (!asset?.uri) return;
                      setBusyId(item.number);
                      void replacePrescriptionImage(item.number, {
                        imageUri: asset.uri,
                        scannedText: '',
                      })
                        .then(() => refresh())
                        .finally(() => setBusyId(''));
                    });
                  }}
                >
                  <Text style={styles.replaceText}>
                    {busyId === item.number ? 'Uploading…' : 'Replace unclear photo'}
                  </Text>
                </Pressable>
              ) : null}
              {item.status === 'approved' ? (
                <Pressable
                  style={styles.replaceBtn}
                  onPress={() => {
                    setPrescriptionNumber(item.number);
                    router.push('/checkout');
                  }}
                >
                  <Text style={styles.replaceText}>Use for checkout</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: 14, paddingBottom: 40 },
  talkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: 14,
  },
  talkText: { fontWeight: '700', color: colors.accentDark },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: 8 },
  kicker: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { color: colors.textSecondary, fontSize: 13 },
  section: { marginTop: 6, fontWeight: '700', color: colors.text, fontSize: 13 },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  image: { width: '100%', height: 160, borderRadius: 12, backgroundColor: colors.backgroundAlt },
  warn: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  replaceBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  replaceText: { color: colors.accentDark, fontWeight: '700' },
});
