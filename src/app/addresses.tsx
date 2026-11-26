import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  PermissionsAndroid,
  Platform,
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
import { isAddressComplete, missingAddressFields } from '@/lib/addressComplete';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Address } from '@/types';

type CountryCode = 'US' | 'PK';

type FormState = {
  label: string;
  recipientName: string;
  phone: string;
  houseNo: string;
  street: string;
  area: string;
  city: string;
  landmark: string;
  deliveryInstructions: string;
  lat: number | null;
  lng: number | null;
  country: CountryCode;
  locationConfirmed: boolean;
};

const emptyForm = (name = '', phone = ''): FormState => ({
  label: 'Home',
  recipientName: name,
  phone,
  houseNo: '',
  street: '',
  area: '',
  city: '',
  landmark: '',
  deliveryInstructions: '',
  lat: null,
  lng: null,
  country: 'PK',
  locationConfirmed: false,
});

function phoneDigitsOk(phone: string, country: CountryCode) {
  const digits = phone.replace(/\D/g, '');
  if (country === 'PK') return digits.length >= 10 && digits.length <= 12;
  return digits.length >= 10 && digits.length <= 15;
}

function formFromAddress(item: Address, fallbackName = '', fallbackPhone = ''): FormState {
  return {
    label: item.label || 'Home',
    recipientName: item.recipientName || fallbackName,
    phone: item.phone || fallbackPhone,
    houseNo: item.houseNo || '',
    street: item.street || '',
    area: item.area || '',
    city: item.city || '',
    landmark: item.landmark ?? '',
    deliveryInstructions: item.deliveryInstructions ?? '',
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    country: item.phone?.startsWith('+92') ? 'PK' : 'US',
    locationConfirmed: item.lat != null && item.lng != null,
  };
}

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'Addresses'>>();
  const completeId = route.params?.completeId;
  const {
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    refreshAddresses,
    addAddress,
    editAddress,
    removeAddress,
    user,
  } = useApp();
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState<FormState>(emptyForm(user?.name ?? '', user?.phone ?? ''));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locationNote, setLocationNote] = useState('');

  const openComplete = useCallback(
    (item: Address) => {
      setEditingId(item.id);
      setCompleting(true);
      setForm(formFromAddress(item, user?.name ?? '', user?.phone ?? ''));
      setError(
        missingAddressFields(item).length
          ? `Complete missing: ${missingAddressFields(item).join(', ')}.`
          : '',
      );
      setLocationNote('');
      setMode('form');
    },
    [user?.name, user?.phone],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void refreshAddresses()
        .then((list) => {
          if (!active) return;
          if (completeId) {
            const target = list.find((row) => row.id === completeId);
            if (target && !isAddressComplete(target)) {
              openComplete(target);
              return;
            }
            if (target) {
              setSelectedAddressId(target.id);
              router.back();
              return;
            }
          }
          setMode('list');
          setEditingId(null);
          setCompleting(false);
          setError('');
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [refreshAddresses, completeId, openComplete, setSelectedAddressId]),
  );

  const staticMap = useMemo(() => {
    if (form.lat == null || form.lng == null) return null;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${form.lat},${form.lng}&zoom=15&size=600x280&markers=${form.lat},${form.lng},red-pushpin`;
  }, [form.lat, form.lng]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'lat' || key === 'lng' || key === 'street' || key === 'area' || key === 'city'
        ? { locationConfirmed: false }
        : null),
    }));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm(user?.name ?? '', user?.phone ?? ''));
    setError('');
    setLocationNote('');
    setMode('form');
  };

  const openEdit = (id: string) => {
    const item = addresses.find((row) => row.id === id);
    if (!item) return;
    setCompleting(false);
    setEditingId(item.id);
    setForm(formFromAddress(item, user?.name ?? '', user?.phone ?? ''));
    setError('');
    setLocationNote('');
    setMode('form');
  };

  const selectOrComplete = (item: Address) => {
    if (!isAddressComplete(item)) {
      openComplete(item);
      return;
    }
    setSelectedAddressId(item.id);
    router.back();
  };

  const useCurrentLocation = async () => {
    setLocationNote('');
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Delivery location',
            message: 'Hera uses your location to place the map pin near your address.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not now',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationNote('Location permission denied. Enter the address and place a pin manually, or type the full address.');
          return;
        }
      }
      const geo = (
        globalThis as {
          navigator?: {
            geolocation?: {
              getCurrentPosition: (
                success: (pos: { coords: { latitude: number; longitude: number } }) => void,
                error?: () => void,
                options?: { enableHighAccuracy?: boolean; timeout?: number },
              ) => void;
            };
          };
        }
      ).navigator?.geolocation;
      if (!geo) {
        setLocationNote('Location services are unavailable on this build. Enter the address manually and confirm it.');
        return;
      }
      geo.getCurrentPosition(
        (pos: { coords: { latitude: number; longitude: number } }) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Only set the pin from GPS — never auto-fill address text from map reverse-geocode
          // (Nominatim was injecting local-script city/country the user never typed).
          setForm((prev) => ({ ...prev, lat, lng, locationConfirmed: false }));
          setLocationNote('Pin placed from current location. Enter / confirm the written address below.');
        },
        () => setLocationNote('Could not read GPS. Enter the address manually and confirm it.'),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } catch {
      setLocationNote('Could not read GPS. Enter the address manually and confirm it.');
    }
  };

  const onSave = () => {
    if (
      !form.label.trim() ||
      !form.recipientName.trim() ||
      !form.phone.trim() ||
      !form.houseNo.trim() ||
      !form.street.trim() ||
      !form.area.trim() ||
      !form.city.trim()
    ) {
      setError('Fill recipient name, phone, house/flat, street, area, and city.');
      return;
    }
    if (!phoneDigitsOk(form.phone, form.country)) {
      setError(
        form.country === 'PK'
          ? 'Enter a valid Pakistan phone number (10–12 digits).'
          : 'Enter a valid phone number (10–15 digits).',
      );
      return;
    }
    if (form.lat == null || form.lng == null) {
      setError('Set a map pin with current location or the N/S/E/W controls, then confirm it.');
      return;
    }
    if (!form.locationConfirmed) {
      setError('Confirm the pin and written address before saving.');
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      label: form.label.trim(),
      recipientName: form.recipientName.trim(),
      phone: form.phone.trim(),
      houseNo: form.houseNo.trim(),
      street: form.street.trim(),
      area: form.area.trim(),
      city: form.city.trim(),
      landmark: form.landmark.trim(),
      deliveryInstructions: form.deliveryInstructions.trim(),
      lat: form.lat,
      lng: form.lng,
      isDefault: true,
    };
    const action = editingId ? editAddress(editingId, payload) : addAddress(payload);
    void action
      .then((saved) => {
        setSelectedAddressId(saved.id);
        setEditingId(null);
        setCompleting(false);
        setMode('list');
        setForm(emptyForm(user?.name ?? '', user?.phone ?? ''));
        router.back();
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not save address');
      })
      .finally(() => setBusy(false));
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScreenHeader
        title={
          mode === 'form'
            ? completing
              ? 'Complete address'
              : editingId
                ? 'Edit address'
                : 'Add address'
            : 'Addresses'
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {mode === 'list' ? (
          <>
            <Text style={styles.section}>Saved addresses</Text>
            {addresses.length === 0 ? (
              <Text style={styles.empty}>No saved address yet. Add one to continue checkout.</Text>
            ) : (
              addresses.map((item) => {
                const selected = item.id === selectedAddressId;
                const complete = isAddressComplete(item);
                return (
                  <View key={item.id} style={[styles.card, shadows.soft, selected && styles.cardSelected]}>
                    <Pressable style={styles.cardMain} onPress={() => selectOrComplete(item)}>
                      <View style={styles.homeIcon}>
                        <Ionicons name="home" size={16} color={colors.accentDark} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          {item.label}
                          {item.isDefault ? ' · Default' : ''}
                          {!complete ? ' · Incomplete' : ''}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {item.recipientName ? `${item.recipientName} · ` : ''}
                          {item.phone || ''}
                        </Text>
                        <Text style={styles.cardMeta}>{item.line}</Text>
                        {!complete ? (
                          <Text style={styles.warnMeta}>
                            Missing {missingAddressFields(item).join(', ')} — tap to complete
                          </Text>
                        ) : null}
                      </View>
                      {selected && complete ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                      ) : null}
                    </Pressable>
                    <View style={styles.cardActions}>
                      <Pressable hitSlop={8} onPress={() => (complete ? openEdit(item.id) : openComplete(item))}>
                        <Text style={styles.editLink}>{complete ? 'Edit' : 'Complete'}</Text>
                      </Pressable>
                      {!item.isDefault ? (
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            void editAddress(item.id, {
                              label: item.label,
                              recipientName: item.recipientName,
                              phone: item.phone,
                              houseNo: item.houseNo,
                              street: item.street,
                              area: item.area,
                              city: item.city,
                              landmark: item.landmark,
                              deliveryInstructions: item.deliveryInstructions,
                              lat: item.lat,
                              lng: item.lng,
                              isDefault: true,
                            }).catch((err: unknown) => {
                              setError(err instanceof Error ? err.message : 'Could not set default');
                            });
                          }}
                        >
                          <Text style={styles.editLink}>Set default</Text>
                        </Pressable>
                      ) : null}
                      <Pressable hitSlop={8} onPress={() => selectOrComplete(item)}>
                        <Text style={styles.editLink}>{complete ? 'Use for checkout' : 'Complete for checkout'}</Text>
                      </Pressable>
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
                    </View>
                  </View>
                );
              })
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Add address" onPress={openAdd} style={styles.locationBtn} />
          </>
        ) : (
          <>
            <Pressable
              onPress={() => {
                setMode('list');
                setEditingId(null);
                setError('');
              }}
            >
              <Text style={styles.editLink}>← Back to saved addresses</Text>
            </Pressable>

            <Text style={styles.section}>Phone country</Text>
            <View style={styles.countryRow}>
              {(['US', 'PK'] as CountryCode[]).map((code) => (
                <Pressable
                  key={code}
                  onPress={() => setField('country', code)}
                  style={[styles.countryChip, form.country === code && styles.countryOn]}
                >
                  <Text style={styles.countryText}>{code === 'US' ? 'United States' : 'Pakistan'}</Text>
                </Pressable>
              ))}
            </View>

            <PrimaryButton label="Use Current Location" onPress={() => void useCurrentLocation()} style={styles.locationBtn} />
            <PrimaryButton
              label="Place map pin manually"
              variant="outline"
              onPress={() => {
                const seed =
                  form.country === 'PK'
                    ? { lat: 24.8607, lng: 67.0011 }
                    : { lat: 40.758, lng: -73.9855 };
                setForm((prev) => ({
                  ...prev,
                  lat: prev.lat ?? seed.lat,
                  lng: prev.lng ?? seed.lng,
                  locationConfirmed: false,
                }));
                setLocationNote('Pin placed. Nudge it to your building, fill the address, then confirm.');
              }}
            />
            {locationNote ? <Text style={styles.hint}>{locationNote}</Text> : null}
            {form.lat == null || form.lng == null ? (
              <Text style={styles.hint}>
                Allow location, or place a map pin manually, then confirm the written address.
              </Text>
            ) : null}
            {staticMap ? (
              <View style={styles.mapWrap}>
                <Image source={{ uri: staticMap }} style={styles.mapImage} resizeMode="cover" />
                <Text style={styles.mapHint}>Adjust pin</Text>
                <View style={styles.nudgeRow}>
                  <Pressable style={styles.nudge} onPress={() => setField('lat', (form.lat ?? 0) + 0.001)}>
                    <Text style={styles.nudgeText}>N</Text>
                  </Pressable>
                  <Pressable style={styles.nudge} onPress={() => setField('lat', (form.lat ?? 0) - 0.001)}>
                    <Text style={styles.nudgeText}>S</Text>
                  </Pressable>
                  <Pressable style={styles.nudge} onPress={() => setField('lng', (form.lng ?? 0) - 0.001)}>
                    <Text style={styles.nudgeText}>W</Text>
                  </Pressable>
                  <Pressable style={styles.nudge} onPress={() => setField('lng', (form.lng ?? 0) + 0.001)}>
                    <Text style={styles.nudgeText}>E</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {(
              [
                ['label', 'Label', 'Home'],
                ['recipientName', 'Recipient name', 'Full name'],
                ['phone', 'Phone', form.country === 'PK' ? '+92 ...' : '+1 ...'],
                ['houseNo', 'House / flat number', 'Apt 4B'],
                ['street', 'Street', 'Street name'],
                ['area', 'Area', 'Neighborhood'],
                ['city', 'City', 'City'],
                ['landmark', 'Landmark (optional)', 'Near ...'],
                ['deliveryInstructions', 'Delivery instructions (optional)', 'Gate code, floor...'],
              ] as const
            ).map(([key, title, placeholder]) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{title}</Text>
                <TextInput
                  style={styles.input}
                  value={String(form[key] ?? '')}
                  onChangeText={(value) => setField(key, value)}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
                />
              </View>
            ))}

            <Pressable
              onPress={() => setField('locationConfirmed', !form.locationConfirmed)}
              style={[styles.confirmRow, form.locationConfirmed && styles.confirmOn]}
            >
              <Ionicons
                name={form.locationConfirmed ? 'checkbox' : 'square-outline'}
                size={20}
                color={form.locationConfirmed ? colors.accentDark : colors.textSecondary}
              />
              <Text style={styles.cardMeta}>I confirm this pin and the full written address</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={busy ? 'Saving...' : editingId ? 'Update address' : 'Save address'}
              loading={busy}
              onPress={onSave}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 28, gap: 10 },
  section: { marginTop: spacing.lg, color: colors.textSecondary, fontWeight: '600' },
  empty: { color: colors.textSecondary, marginBottom: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 10,
  },
  cardSelected: { borderColor: colors.borderStrong },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  homeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontWeight: '700', color: colors.text },
  cardMeta: { marginTop: 2, color: colors.textSecondary, fontSize: 13, flex: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  editLink: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  field: { gap: 6 },
  label: { fontWeight: '600', color: colors.text, fontSize: 13 },
  input: {
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.text,
  },
  error: { color: colors.danger, fontWeight: '600' },
  warnMeta: { marginTop: 4, color: colors.danger, fontSize: 12, fontWeight: '600' },
  hint: { color: colors.textSecondary, fontSize: 13 },
  locationBtn: { marginTop: 4 },
  mapWrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: 10,
  },
  mapImage: { width: '100%', height: 160 },
  mapHint: { marginTop: 8, marginHorizontal: 12, fontWeight: '600', color: colors.text },
  nudgeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginTop: 8 },
  nudge: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeText: { fontWeight: '700', color: colors.text },
  countryRow: { flexDirection: 'row', gap: 8 },
  countryChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  countryOn: { borderColor: colors.borderStrong, backgroundColor: colors.accentSoft },
  countryText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});
