import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadTestCards, simulateCardPayment, type SimulatedPayment } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme';

type Props = {
  visible: boolean;
  amount: number;
  method: 'debit_card' | 'credit_card';
  methodLabel: string;
  onClose: () => void;
  onSuccess: (payment: SimulatedPayment) => void;
};

type Phase = 'form' | 'processing' | 'success' | 'failed';

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function CardPaymentModal({ visible, amount, method, methodLabel, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('form');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<SimulatedPayment | null>(null);
  const [hints, setHints] = useState<
    { number: string; label: string; outcome: string; expiryHint: string; cvvHint: string }[]
  >([]);
  const idempotencyRef = useRef(`pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const payingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setPhase('form');
    setError('');
    setResult(null);
    payingRef.current = false;
    idempotencyRef.current = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    void loadTestCards()
      .then((payload) => setHints(payload.cards))
      .catch(() => undefined);
  }, [visible, method]);

  const title = useMemo(
    () => (method === 'debit_card' ? 'Debit Card Payment' : 'Credit Card Payment'),
    [method],
  );

  const fillTestCard = (number: string, expiryHint: string, cvvHint: string) => {
    setCardNumber(formatCardNumber(number));
    setExpiry(expiryHint);
    setCvv(cvvHint);
    if (!cardholderName.trim()) setCardholderName('Test Customer');
    setError('');
  };

  const validateLocal = () => {
    if (cardholderName.trim().length < 2) return 'Enter the cardholder name';
    if (cardNumber.replace(/\D/g, '').length < 13) return 'Enter a valid card number';
    if (!/^\d{2}\/\d{2}$/.test(expiry.trim())) return 'Use expiry as MM/YY';
    if (cvv.replace(/\D/g, '').length < 3) return 'Enter the CVV';
    return '';
  };

  const payNow = async () => {
    if (payingRef.current) return;
    const localError = validateLocal();
    if (localError) {
      setError(localError);
      return;
    }
    payingRef.current = true;
    setError('');
    setPhase('processing');
    try {
      const payment = await simulateCardPayment({
        amount,
        method,
        cardholderName: cardholderName.trim(),
        cardNumber,
        expiry: expiry.trim(),
        cvv,
        idempotencyKey: idempotencyRef.current,
      });
      setResult(payment);
      if (payment.status === 'succeeded') {
        setPhase('success');
      } else {
        setPhase('failed');
        setError(payment.failureMessage || 'Payment failed');
        // New key so retry creates a new attempt instead of replaying the failed idempotent result.
        idempotencyRef.current = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment could not be processed';
      setError(message);
      setPhase('failed');
      idempotencyRef.current = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    } finally {
      payingRef.current = false;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }, shadows.medium]}>
          <View style={styles.head}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.sub}>{methodLabel} · simulated checkout</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close payment">
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>TEST MODE — no real money</Text>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {phase === 'form' || phase === 'failed' ? (
              <>
                <Text style={styles.amountLabel}>Total Payment Amount</Text>
                <Text style={styles.amount}>{formatMoney(amount)}</Text>

                <Text style={styles.label}>Cardholder Name</Text>
                <TextInput
                  style={styles.input}
                  value={cardholderName}
                  onChangeText={setCardholderName}
                  placeholder="Name on card"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />

                <Text style={styles.label}>Card Number</Text>
                <TextInput
                  style={styles.input}
                  value={cardNumber}
                  onChangeText={(value) => setCardNumber(formatCardNumber(value))}
                  placeholder="ACCT-000006"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={19}
                />

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.label}>Expiry (MM/YY)</Text>
                    <TextInput
                      style={styles.input}
                      value={expiry}
                      onChangeText={(value) => setExpiry(formatExpiry(value))}
                      placeholder="12/30"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      style={styles.input}
                      value={cvv}
                      onChangeText={(value) => setCvv(value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Text style={styles.hintTitle}>Test cards</Text>
                {(hints.length
                  ? hints
                  : [
                      {
                        number: '4111111111111111',
                        label: 'Visa — success',
                        outcome: 'succeeded',
                        expiryHint: '12/30',
                        cvvHint: '123',
                      },
                      {
                        number: '4000000000000002',
                        label: 'Visa — declined',
                        outcome: 'failed',
                        expiryHint: '12/30',
                        cvvHint: '123',
                      },
                    ]
                ).map((card) => (
                  <Pressable
                    key={card.number}
                    style={styles.hintCard}
                    onPress={() => fillTestCard(card.number, card.expiryHint, card.cvvHint)}
                  >
                    <Text style={styles.hintLabel}>{card.label}</Text>
                    <Text style={styles.hintMeta}>
                      {card.number} · {card.outcome}
                    </Text>
                  </Pressable>
                ))}

                <Pressable style={styles.payBtn} onPress={() => void payNow()}>
                  <Text style={styles.payBtnText}>{phase === 'failed' ? 'Retry payment' : 'Pay Now'}</Text>
                </Pressable>
              </>
            ) : null}

            {phase === 'processing' ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accentDark} />
                <Text style={styles.centerTitle}>Processing payment…</Text>
                <Text style={styles.centerSub}>Simulating authorization. Do not close this screen.</Text>
              </View>
            ) : null}

            {phase === 'success' && result ? (
              <View style={styles.center}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={36} color={colors.primaryContrast} />
                </View>
                <Text style={styles.centerTitle}>Payment Successful</Text>
                <Text style={styles.centerSub}>Transaction {result.transactionId}</Text>
                <Text style={styles.centerSub}>
                  {formatMoney(result.amount)} · {result.cardBrand} •••• {result.cardLast4}
                </Text>
                <Pressable
                  style={styles.payBtn}
                  onPress={() => {
                    onSuccess(result);
                    onClose();
                  }}
                >
                  <Text style={styles.payBtnText}>Confirm order</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.lg,
  },
  head: {
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  testBadge: {
    marginTop: spacing.md,
    marginHorizontal: spacing.xl,
    alignSelf: 'flex-start',
    backgroundColor: colors.chipOrange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  testBadgeText: { color: colors.chipOrangeText, fontWeight: '700', fontSize: 12 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  amountLabel: { color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  amount: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.backgroundAlt,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  error: { marginTop: spacing.md, color: colors.danger, fontWeight: '600' },
  hintTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  hintCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundAlt,
  },
  hintLabel: { fontWeight: '700', color: colors.text },
  hintMeta: { marginTop: 2, color: colors.textSecondary, fontSize: 12 },
  payBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payBtnText: { color: colors.primaryContrast, fontWeight: '700', fontSize: 16 },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  centerTitle: { marginTop: spacing.lg, fontSize: 20, fontWeight: '700', color: colors.text },
  centerSub: { marginTop: 8, color: colors.textSecondary, textAlign: 'center' },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
