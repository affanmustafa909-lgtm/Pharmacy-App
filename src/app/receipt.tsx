import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { captureRef, type ViewShotRef } from 'react-native-view-shot';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { loadReceipt } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';

type Receipt = Awaited<ReturnType<typeof loadReceipt>>;

function formatWhen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StoreBlock({
  title,
  orderId,
  storeName,
  items,
  productSubtotal,
  deliveryCharge,
  serviceCharge,
  bfpCharge,
  discount,
  total,
  paymentLabel,
  paymentStatus,
}: {
  title?: string;
  orderId: string;
  storeName?: string;
  items: Receipt['items'];
  productSubtotal: number;
  deliveryCharge: number;
  serviceCharge: number;
  bfpCharge: number;
  discount: number;
  total: number;
  paymentLabel?: string;
  paymentStatus?: string;
}) {
  return (
    <View style={styles.storeBlock}>
      {title ? <Text style={styles.storeTitle}>{title}</Text> : null}
      <Text style={styles.orderId}>{orderId}</Text>
      {storeName ? <Text style={styles.storeName}>{storeName}</Text> : null}

      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.colItem]}>Item</Text>
        <Text style={[styles.th, styles.colQty]}>Qty</Text>
        <Text style={[styles.th, styles.colAmt]}>Amount</Text>
      </View>
      {items.map((item, index) => (
        <View key={`${item.name}-${index}`} style={styles.tableRow}>
          <View style={styles.colItem}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemMeta}>{formatMoney(item.unitPrice)} each</Text>
          </View>
          <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
          <Text style={[styles.td, styles.colAmt]}>{formatMoney(item.lineTotal)}</Text>
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.moneyRow}>
        <Text style={styles.moneyLabel}>Products</Text>
        <Text style={styles.moneyValue}>{formatMoney(productSubtotal)}</Text>
      </View>
      <View style={styles.moneyRow}>
        <Text style={styles.moneyLabel}>Delivery</Text>
        <Text style={styles.moneyValue}>{formatMoney(deliveryCharge)}</Text>
      </View>
      <View style={styles.moneyRow}>
        <Text style={styles.moneyLabel}>Service</Text>
        <Text style={styles.moneyValue}>{formatMoney(serviceCharge)}</Text>
      </View>
      {bfpCharge > 0 ? (
        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>BFP</Text>
          <Text style={styles.moneyValue}>{formatMoney(bfpCharge)}</Text>
        </View>
      ) : null}
      {discount > 0 ? (
        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>Discount</Text>
          <Text style={[styles.moneyValue, styles.discount]}>-{formatMoney(discount)}</Text>
        </View>
      ) : null}

      <View style={[styles.moneyRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Store total</Text>
        <Text style={styles.totalValue}>{formatMoney(total)}</Text>
      </View>

      {paymentLabel || paymentStatus ? (
        <View style={styles.payPill}>
          <Ionicons name="card-outline" size={14} color={colors.accentDark} />
          <Text style={styles.payPillText}>
            {[paymentLabel, paymentStatus].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ReceiptScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'Receipt'>>();
  const orderId = route.params?.orderId ?? '';
  const shotRef = useRef<ViewShotRef>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);

  const refresh = useCallback(() => {
    if (!orderId) {
      setStatus('error');
      setError('Missing order number');
      return;
    }
    setStatus('loading');
    setError('');
    void loadReceipt(orderId)
      .then((next) => {
        setReceipt(next);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Could not load receipt');
      });
  }, [orderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onShare = async () => {
    if (!receipt || !shotRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        fileName: `Hera-Receipt-${receipt.id}`,
      });
      const fileUrl = uri.startsWith('file://') ? uri : `file://${uri}`;
      // Image-only share — avoid `message` so Android does not open a "Sharing text" sheet.
      await Share.open({
        title: `Hera receipt ${receipt.id}`,
        subject: `Hera Pharmacy receipt ${receipt.id}`,
        url: fileUrl,
        type: 'image/png',
        filename: `Hera-Receipt-${receipt.id}`,
        failOnCancel: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/cancel|dismiss/i.test(message)) {
        Alert.alert('Share failed', message || 'Could not share receipt image');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScreenHeader title="Receipt" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {status === 'loading' ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : null}
        {status === 'error' ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error || 'Could not load receipt'}</Text>
            <PrimaryButton label="Retry" onPress={refresh} style={{ marginTop: 12 }} />
          </View>
        ) : null}

        {status === 'ready' && receipt ? (
          <>
            <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.shotWrap}>
              <View style={[styles.ticket, shadows.soft]}>
                <View style={styles.brandRow}>
                  <View style={styles.brandMark}>
                    <Text style={styles.brandMarkText}>H</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.brand}>Hera Pharmacy</Text>
                    <Text style={styles.brandSub}>Official order receipt</Text>
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Date</Text>
                    <Text style={styles.metaValue}>{formatWhen(receipt.createdAt) || '—'}</Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Status</Text>
                    <Text style={styles.metaValue}>
                      {(receipt.status || 'placed').replaceAll('_', ' ')}
                    </Text>
                  </View>
                </View>

                {receipt.recipientName || receipt.recipientPhone || receipt.addressLine ? (
                  <View style={styles.addressBox}>
                    <Text style={styles.sectionEyebrow}>
                      {receipt.deliveryType === 'pickup' ? 'Pickup' : 'Deliver to'}
                    </Text>
                    {receipt.recipientName ? (
                      <Text style={styles.addressName}>{receipt.recipientName}</Text>
                    ) : null}
                    {receipt.recipientPhone ? (
                      <Text style={styles.addressLine}>{receipt.recipientPhone}</Text>
                    ) : null}
                    {receipt.addressLine ? (
                      <Text style={styles.addressLine}>{receipt.addressLine}</Text>
                    ) : null}
                  </View>
                ) : null}

                <StoreBlock
                  orderId={receipt.id}
                  storeName={receipt.storeName}
                  items={receipt.items}
                  productSubtotal={receipt.productSubtotal}
                  deliveryCharge={receipt.deliveryCharge}
                  serviceCharge={receipt.serviceCharge}
                  bfpCharge={receipt.bfpCharge}
                  discount={receipt.discount}
                  total={receipt.total}
                  paymentLabel={receipt.paymentLabel}
                  paymentStatus={receipt.paymentStatus}
                />

                {(receipt.relatedOrders ?? []).map((related) => (
                  <StoreBlock
                    key={related.id}
                    title="Also fulfilled by"
                    orderId={related.id}
                    storeName={related.storeName}
                    items={related.items}
                    productSubtotal={related.items.reduce((sum, item) => sum + item.lineTotal, 0)}
                    deliveryCharge={0}
                    serviceCharge={0}
                    bfpCharge={0}
                    discount={0}
                    total={related.total}
                    paymentStatus={related.paymentStatus}
                  />
                ))}

                <View style={styles.grandTotal}>
                  <Text style={styles.grandLabel}>Final total</Text>
                  <Text style={styles.grandValue}>
                    {formatMoney(receipt.combinedTotal ?? receipt.total)}
                  </Text>
                </View>

                <Text style={styles.thanks}>Thank you for choosing Hera</Text>
                <View style={styles.perforation}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
              </View>
            </ViewShot>

            <PrimaryButton
              label={sharing ? 'Preparing image…' : 'Share receipt'}
              icon="share-outline"
              loading={sharing}
              onPress={() => void onShare()}
              style={{ marginTop: 8 }}
            />
            <PrimaryButton
              label="Track order"
              variant="outline"
              onPress={() =>
                router.push(`/track-order?orderId=${encodeURIComponent(receipt.id)}`)
              }
              style={{ marginTop: 10 }}
            />
            <Pressable onPress={() => router.back()} style={styles.backLink}>
              <Text style={styles.backLinkText}>Back to orders</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 40, gap: 12 },
  errorBox: { marginTop: 32, alignItems: 'center', gap: 8 },
  errorText: { color: colors.danger, textAlign: 'center' },
  shotWrap: { backgroundColor: colors.background },
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: 14,
    overflow: 'hidden',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: colors.primaryContrast, fontSize: 20, fontWeight: '800' },
  brand: { fontSize: 20, fontWeight: '800', color: colors.text },
  brandSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  metaGrid: { flexDirection: 'row', gap: 10 },
  metaCell: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  metaLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  metaValue: { fontSize: 13, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  addressBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentDark,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  addressName: { fontSize: 15, fontWeight: '700', color: colors.text },
  addressLine: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  storeBlock: { gap: 8, marginTop: 4 },
  storeTitle: { fontSize: 12, fontWeight: '700', color: colors.accentDark, textTransform: 'uppercase' },
  orderId: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  storeName: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginTop: 4,
  },
  tableRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 4 },
  th: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  td: { fontSize: 14, color: colors.text, fontWeight: '600' },
  colItem: { flex: 1.4 },
  colQty: { width: 40, textAlign: 'center' },
  colAmt: { width: 78, textAlign: 'right' },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  moneyLabel: { color: colors.textSecondary, fontSize: 13 },
  moneyValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  discount: { color: colors.accentDark },
  totalRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  payPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  payPillText: { color: colors.accentDark, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  grandTotal: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 13 },
  grandValue: { color: colors.primaryContrast, fontWeight: '800', fontSize: 22 },
  thanks: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  perforation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  backLink: { alignItems: 'center', paddingVertical: 12 },
  backLinkText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
});
