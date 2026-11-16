import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { colors, radii, shadows, spacing } from '@/theme';

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const {
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    refreshAddresses,
    addAddress,
    removeAddress,
  } = useApp();
  const [label, setLabel] = useState('Home');
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refreshAddresses().catch(() => undefined);
    }, [refreshAddresses]),
  );

  const onSave = () => {
    const nextLabel = label.trim();
    const nextLine = line.trim();
    if (!nextLabel || !nextLine) {
      setError('Enter a label and full address');
      return;
    }
    setBusy(true);
    setError('');
    void addAddress({ label: nextLabel, line: nextLine })
      .then(() => {
        setLine('');
        setLabel('Home');
        router.back();
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not save address');
      })
      .finally(() => setBusy(false));
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScreenHeader title="Delivery address" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Saved addresses</Text>
        {addresses.length === 0 ? (
          <Text style={styles.empty}>No saved address yet. Add one below.</Text>
        ) : (
          addresses.map((item) => {
            const selected = item.id === selectedAddressId;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedAddressId(item.id);
                  router.back();
                }}
                style={[styles.card, shadows.soft, selected && styles.cardSelected]}
              >
                <View style={styles.homeIcon}>
                  <Ionicons name="home" size={16} color={colors.accentDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.cardMeta}>{item.line}</Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                ) : (
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      void removeAddress(item.id).catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : 'Could not delete address');
                      });
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                  </Pressable>
                )}
              </Pressable>
            );
          })
        )}

        <Text style={styles.section}>Add new address</Text>
        <View style={[styles.form, shadows.soft]}>
          <Text style={styles.fieldLabel}>Label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Home, Work, Other"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>Full address</Text>
          <TextInput
            value={line}
            onChangeText={setLine}
            placeholder="Street, area, city"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[styles.input, styles.area]}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label={busy ? 'Saving…' : 'Save address'}
            loading={busy}
            onPress={onSave}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  empty: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.borderStrong,
  },
  homeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: 8,
  },
  fieldLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  area: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
