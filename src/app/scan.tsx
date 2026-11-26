import { Haptics } from '@/lib/haptics';
import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/CircleButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import {
  identifyMedicinePhoto,
  matchMedicinePhoto,
  submitPrescription,
} from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { loadPendingPhoto, savePendingPhoto, type PendingPhoto } from '@/lib/session';
import type { CatalogPhotoMatch, DetectedMedicine } from '@/types';
import { colors, radii, shadows, spacing } from '@/theme';

type Phase =
  | 'permission'
  | 'aim'
  | 'preview'
  | 'type'
  | 'confirm'
  | 'results'
  | 'send'
  | 'done';

type UploadType = 'medicine_packaging' | 'prescription';

type OtherStore = {
  productId: string;
  storeId: string;
  storeName: string;
  address: string;
  openUntil: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  inStock: boolean;
  rxRequired: boolean;
};

function openAppSettings() {
  if (Platform.OS === 'ios') {
    void Linking.openURL('app-settings:');
    return;
  }
  void Linking.openSettings();
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const {
    selectedStoreId,
    setSelectedStoreId,
    stores,
    isAuthenticated,
    authReady,
    setPrescriptionNumber,
    addToCart,
  } = useApp();

  const [permission, setPermission] = useState<'loading' | 'granted' | 'denied' | 'blocked'>('loading');
  const [phase, setPhase] = useState<Phase>('permission');
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState('photo.jpg');
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [uploadType, setUploadType] = useState<UploadType>('prescription');
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState('');
  const [packSize, setPackSize] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [detected, setDetected] = useState<DetectedMedicine>({});
  const [matches, setMatches] = useState<CatalogPhotoMatch[]>([]);
  const [otherStores, setOtherStores] = useState<OtherStore[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<CatalogPhotoMatch | null>(null);
  const [multiple, setMultiple] = useState(false);
  const [unmatched, setUnmatched] = useState(false);
  const [unclear, setUnclear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [doneNumber, setDoneNumber] = useState('');
  const [sendStoreId, setSendStoreId] = useState(selectedStoreId || '');

  const refreshPermission = useCallback(() => {
    const status = Camera.getCameraPermissionStatus();
    if (status === 'granted') {
      setPermission('granted');
      setPhase((prev) => (prev === 'permission' ? 'aim' : prev));
      return;
    }
    if (status === 'denied' || status === 'restricted') {
      setPermission('blocked');
      return;
    }
    setPermission('denied');
  }, []);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  useFocusEffect(
    useCallback(() => {
      refreshPermission();
      if (!authReady) return;
      void loadPendingPhoto().then((pending) => {
        if (!pending?.imageUri) return;
        restorePending(pending);
        if (isAuthenticated) {
          void savePendingPhoto(null);
        }
      });
    }, [authReady, isAuthenticated, refreshPermission]),
  );

  useEffect(() => {
    if (selectedStoreId && !sendStoreId) setSendStoreId(selectedStoreId);
  }, [selectedStoreId, sendStoreId]);

  const restorePending = (pending: PendingPhoto) => {
    setCapturedUri(pending.imageUri);
    setFileName(pending.fileName || 'photo.jpg');
    setMimeType(pending.mimeType || 'image/jpeg');
    setUploadType(pending.uploadType);
    setName(pending.medicineName || '');
    setStrength(pending.strength || '');
    setForm(pending.form || '');
    setPackSize(pending.packSize || '');
    setCustomerNote(pending.customerNote || '');
    if (pending.storeId) setSendStoreId(pending.storeId);
    if (pending.phase === 'send' || pending.phase === 'results' || pending.phase === 'confirm') {
      setPhase(pending.phase as Phase);
    } else {
      setPhase('type');
    }
  };

  const requestPermission = async () => {
    const status = await Camera.requestCameraPermission();
    if (status === 'granted') {
      setPermission('granted');
      setPhase('aim');
      return;
    }
    // Second denial on Android/iOS often means blocked until Settings.
    const again = Camera.getCameraPermissionStatus();
    setPermission(again === 'denied' || again === 'restricted' ? 'blocked' : 'denied');
  };

  const goPreview = (uri: string, nameHint?: string, mime?: string) => {
    setCapturedUri(uri);
    setFileName(nameHint || `hera-${Date.now()}.jpg`);
    setMimeType(mime || 'image/jpeg');
    setError('');
    setPhase('preview');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const takePhoto = async () => {
    if (capturing) return;
    try {
      setCapturing(true);
      if (!cameraRef.current || !device) {
        setError('Camera is unavailable on this device. Use Upload from Gallery.');
        return;
      }
      const photo = await cameraRef.current.takePhoto({
        flash: flash ? 'on' : 'off',
      });
      if (!photo?.path) {
        setError('Could not capture photo. Try again or use Gallery.');
        return;
      }
      goPreview(photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`);
    } catch {
      setError('Capture failed. Try again or upload from Gallery.');
    } finally {
      setCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setError('Could not read the selected image.');
      return;
    }
    goPreview(asset.uri, asset.fileName || 'gallery.jpg', asset.type || 'image/jpeg');
  };

  const resetCapture = () => {
    setCapturedUri(null);
    setError('');
    setMatches([]);
    setSelectedMatch(null);
    setOtherStores([]);
    setUnmatched(false);
    setUnclear(false);
    setDoneNumber('');
    setUploadProgress(0);
    setPhase(permission === 'granted' ? 'aim' : 'permission');
  };

  const ensureAuth = async (nextPhase: Phase) => {
    if (isAuthenticated) return true;
    if (!capturedUri) return false;
    await savePendingPhoto({
      imageUri: capturedUri,
      fileName,
      mimeType,
      uploadType,
      medicineName: name,
      strength,
      form,
      packSize,
      customerNote,
      storeId: sendStoreId || selectedStoreId,
      phase: nextPhase,
    });
    router.push('/auth?returnTo=Scan');
    return false;
  };

  const runIdentify = async () => {
    if (!(await ensureAuth('confirm'))) return;
    setBusy(true);
    setError('');
    try {
      const hint = [name, strength, form, packSize].filter(Boolean).join(' ');
      const result = await identifyMedicinePhoto({
        hintName: name || hint,
        scannedText: hint,
        storeId: sendStoreId || selectedStoreId || undefined,
      });
      setDetected(result.detected);
      if (result.detected.name && !name) setName(result.detected.name);
      if (result.detected.strength && !strength) setStrength(result.detected.strength);
      if (result.detected.form && !form) setForm(result.detected.form);
      if (result.detected.packSize && !packSize) setPackSize(result.detected.packSize);
      setUnclear(result.unclear || Boolean(result.detected.unclear));
      setMatches(result.matches);
      setMultiple(result.multiple);
      setPhase('confirm');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not analyze photo');
      setPhase('confirm');
    } finally {
      setBusy(false);
    }
  };

  const runMatch = async () => {
    if (!name.trim()) {
      setError('Enter the medicine name to continue.');
      return;
    }
    if (!(await ensureAuth('results'))) return;
    setBusy(true);
    setError('');
    setUploadProgress(20);
    try {
      const detectedPayload: DetectedMedicine = {
        name: name.trim(),
        strength: strength.trim(),
        form: form.trim(),
        packSize: packSize.trim(),
        unclear: false,
        confidence: 0.8,
      };
      setDetected(detectedPayload);
      setUploadProgress(55);
      const result = await matchMedicinePhoto({
        storeId: sendStoreId || selectedStoreId || undefined,
        detected: detectedPayload,
      });
      setUploadProgress(100);
      setMatches(result.matches);
      setMultiple(result.multiple);
      setUnmatched(result.unmatched);
      setOtherStores(result.otherStores);
      setSelectedMatch(result.primary);
      setUnclear(Boolean(result.detected.unclear));
      setPhase('results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Catalog lookup failed. Retry.');
    } finally {
      setBusy(false);
    }
  };

  const sendToPharmacy = async () => {
    const storeId = sendStoreId || selectedStoreId;
    if (!capturedUri) {
      setError('Photo missing. Retake or choose another image.');
      return;
    }
    if (!storeId) {
      setError('Select a pharmacy before sending.');
      setPhase('send');
      return;
    }
    if (!(await ensureAuth('send'))) return;

    setBusy(true);
    setError('');
    setUploadProgress(10);
    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 8));
    }, 180);

    try {
      const detectedPayload: DetectedMedicine = {
        name: name.trim() || detected.name,
        strength: strength.trim() || detected.strength,
        form: form.trim() || detected.form,
        packSize: packSize.trim() || detected.packSize,
        unclear,
        confidence: detected.confidence ?? 0.5,
      };
      const prescription = await submitPrescription({
        storeId,
        uploadType,
        imageUri: capturedUri,
        fileName,
        mimeType,
        medicineName: detectedPayload.name || undefined,
        customerNote: customerNote.trim() || undefined,
        scannedText: [detectedPayload.name, detectedPayload.strength, detectedPayload.form, detectedPayload.packSize]
          .filter(Boolean)
          .join('\n'),
        linkedProductId: selectedMatch?.productId,
        detectedDetails: detectedPayload,
      });
      setUploadProgress(100);
      setDoneNumber(prescription.number);
      setPrescriptionNumber(
        uploadType === 'prescription' && prescription.status === 'approved' ? prescription.number : null,
      );
      await savePendingPhoto(null);
      setPhase('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Tap retry.');
      setPhase('send');
    } finally {
      clearInterval(progressTimer);
      setBusy(false);
    }
  };

  const permissionScreen = (
    <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <CircleButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={styles.brand}>Hera</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.permissionBox}>
        <Ionicons name="camera-outline" size={42} color={colors.text} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Hera uses your camera to scan prescriptions and medicine packaging.
        </Text>
        {permission === 'blocked' ? (
          <PrimaryButton label="Open Settings" onPress={openAppSettings} />
        ) : (
          <PrimaryButton label="Enable Camera" onPress={requestPermission} />
        )}
        <PrimaryButton
          label="Upload from Gallery"
          variant="outline"
          onPress={pickFromGallery}
          style={{ marginTop: 12 }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );

  if (permission === 'loading') {
    return <View style={styles.screen} />;
  }

  if ((permission === 'denied' || permission === 'blocked') && phase === 'permission' && !capturedUri) {
    return permissionScreen;
  }

  return (
    <View style={[styles.screen, { backgroundColor: phase === 'aim' ? '#111' : colors.background }]}>
      {phase === 'aim' && permission === 'granted' && device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={phase === 'aim'}
          photo
          torch={flash ? 'on' : 'off'}
        />
      ) : null}

      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <CircleButton
            icon="chevron-back"
            backgroundColor={phase === 'aim' ? 'rgba(255,255,255,0.88)' : colors.surface}
            onPress={() => router.back()}
          />
          <Text style={[styles.brand, phase === 'aim' && styles.brandLight]}>Hera</Text>
          <View style={{ width: 44 }} />
        </View>

        {phase === 'aim' ? (
          <>
            <View style={styles.stage}>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <Text style={styles.statusLight}>
                Align the medicine packaging or prescription, then capture
              </Text>
              {error ? <Text style={styles.errorLight}>{error}</Text> : null}
            </View>
            <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <CircleButton
                icon="images-outline"
                size={48}
                backgroundColor="rgba(255,255,255,0.92)"
                onPress={pickFromGallery}
              />
              <Pressable
                onPress={takePhoto}
                disabled={capturing}
                style={({ pressed }) => [styles.shutter, shadows.medium, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <View style={styles.shutterInner} />
              </Pressable>
              <CircleButton
                icon={flash ? 'flash' : 'flash-off-outline'}
                size={48}
                backgroundColor="rgba(255,255,255,0.92)"
                onPress={() => setFlash((v) => !v)}
              />
            </View>
          </>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
            keyboardShouldPersistTaps="handled"
          >
            {capturedUri ? (
              <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="cover" />
            ) : null}

            {phase === 'preview' ? (
              <>
                <Text style={styles.title}>Review photo</Text>
                <Text style={styles.meta}>Make sure the label or prescription text is readable.</Text>
                <PrimaryButton label="Continue" onPress={() => setPhase('type')} style={{ marginTop: 16 }} />
                <PrimaryButton
                  label={permission === 'granted' ? 'Retake' : 'Choose Another'}
                  variant="outline"
                  onPress={resetCapture}
                  style={{ marginTop: 10 }}
                />
                <PrimaryButton
                  label="Choose Another from Gallery"
                  variant="outline"
                  onPress={pickFromGallery}
                  style={{ marginTop: 10 }}
                />
              </>
            ) : null}

            {phase === 'type' ? (
              <>
                <Text style={styles.title}>What did you upload?</Text>
                <Pressable
                  style={[styles.choice, uploadType === 'medicine_packaging' && styles.choiceOn]}
                  onPress={() => setUploadType('medicine_packaging')}
                >
                  <Text style={styles.choiceTitle}>Medicine packaging</Text>
                  <Text style={styles.meta}>Match against catalog stock, then buy or ask a pharmacist.</Text>
                </Pressable>
                <Pressable
                  style={[styles.choice, uploadType === 'prescription' && styles.choiceOn]}
                  onPress={() => setUploadType('prescription')}
                >
                  <Text style={styles.choiceTitle}>Prescription</Text>
                  <Text style={styles.meta}>Requires pharmacist verification before purchase.</Text>
                </Pressable>
                <PrimaryButton
                  label={busy ? 'Working…' : 'Continue'}
                  loading={busy}
                  onPress={() => void runIdentify()}
                  style={{ marginTop: 16 }}
                />
                <PrimaryButton label="Retake / Choose Another" variant="outline" onPress={resetCapture} style={{ marginTop: 10 }} />
              </>
            ) : null}

            {phase === 'confirm' ? (
              <>
                <Text style={styles.title}>Confirm medicine details</Text>
                {unclear ? (
                  <Text style={styles.warn}>
                    Image details look unclear. Enter what you can read, or send the photo to a pharmacist.
                  </Text>
                ) : null}
                <Text style={styles.label}>Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Calcium Care" placeholderTextColor={colors.textSecondary} />
                <Text style={styles.label}>Strength</Text>
                <TextInput style={styles.input} value={strength} onChangeText={setStrength} placeholder="e.g. 600mg" placeholderTextColor={colors.textSecondary} />
                <Text style={styles.label}>Form</Text>
                <TextInput style={styles.input} value={form} onChangeText={setForm} placeholder="e.g. tablets" placeholderTextColor={colors.textSecondary} />
                <Text style={styles.label}>Pack size</Text>
                <TextInput style={styles.input} value={packSize} onChangeText={setPackSize} placeholder="e.g. 90 tablets" placeholderTextColor={colors.textSecondary} />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PrimaryButton
                  label={busy ? 'Matching…' : 'Match catalog'}
                  loading={busy}
                  onPress={() => void runMatch()}
                  style={{ marginTop: 16 }}
                />
                <PrimaryButton
                  label="Skip match — send to pharmacist"
                  variant="outline"
                  onPress={() => setPhase('send')}
                  style={{ marginTop: 10 }}
                />
              </>
            ) : null}

            {phase === 'results' ? (
              <>
                <Text style={styles.title}>Catalog results</Text>
                {busy ? (
                  <View style={styles.progressRow}>
                    <ActivityIndicator color={colors.accentDark} />
                    <Text style={styles.meta}>Looking up inventory… {uploadProgress}%</Text>
                  </View>
                ) : null}
                {unmatched || matches.length === 0 ? (
                  <Text style={styles.warn}>
                    We couldn’t find this medicine in the catalog. Send the photo to a pharmacist to check availability.
                  </Text>
                ) : null}
                {multiple ? (
                  <Text style={styles.meta}>Multiple possible matches — pick the correct product.</Text>
                ) : null}
                {matches.map((item) => {
                  const selected = selectedMatch?.productId === item.productId;
                  return (
                    <Pressable
                      key={item.productId}
                      style={[styles.matchCard, shadows.soft, selected && styles.choiceOn]}
                      onPress={() => setSelectedMatch(item)}
                    >
                      <Text style={styles.choiceTitle}>{item.name}</Text>
                      <Text style={styles.meta}>
                        {[item.strength, item.packSize, item.storeName].filter(Boolean).join(' · ')}
                      </Text>
                      <Text style={styles.price}>
                        {formatMoney(item.price)} · {item.inStock ? `${item.stock} in stock` : 'Out of stock'}
                      </Text>
                      {item.rxRequired ? <Text style={styles.warn}>Prescription required before purchase</Text> : null}
                    </Pressable>
                  );
                })}
                {selectedMatch && !selectedMatch.inStock ? (
                  <>
                    <Text style={styles.warn}>
                      {selectedMatch.name} is in the catalog but has no stock at {selectedMatch.storeName}.
                    </Text>
                    {otherStores.length ? (
                      <>
                        <Text style={styles.section}>Other pharmacies with stock</Text>
                        {otherStores.map((store) => (
                          <Pressable
                            key={store.productId}
                            style={[styles.matchCard, shadows.soft]}
                            onPress={() => {
                              setSelectedStoreId(store.storeId);
                              setSendStoreId(store.storeId);
                              setSelectedMatch({
                                ...selectedMatch,
                                productId: store.productId,
                                storeId: store.storeId,
                                storeName: store.storeName,
                                price: store.price,
                                stock: store.stock,
                                inStock: true,
                              });
                            }}
                          >
                            <Text style={styles.choiceTitle}>{store.storeName}</Text>
                            <Text style={styles.meta}>
                              {store.address} · {formatMoney(store.price)} · {store.stock} left
                            </Text>
                          </Pressable>
                        ))}
                      </>
                    ) : (
                      <Text style={styles.meta}>No other open pharmacies currently list this SKU in stock.</Text>
                    )}
                  </>
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                {selectedMatch?.inStock && !(uploadType === 'prescription' || selectedMatch.rxRequired) ? (
                  <PrimaryButton
                    label="Add to cart"
                    onPress={() => {
                      addToCart(selectedMatch.productId, 1);
                      if (selectedMatch.storeId) setSelectedStoreId(selectedMatch.storeId);
                      router.push('/(tabs)/cart');
                    }}
                    style={{ marginTop: 16 }}
                  />
                ) : null}
                {selectedMatch?.inStock && (uploadType === 'prescription' || selectedMatch.rxRequired) ? (
                  <Text style={styles.meta}>
                    Pharmacist verification is required before purchase. Send this photo for review.
                  </Text>
                ) : null}
                <PrimaryButton
                  label="Send to Pharmacy"
                  variant={selectedMatch?.inStock && !(uploadType === 'prescription' || selectedMatch.rxRequired) ? 'outline' : undefined}
                  onPress={() => setPhase('send')}
                  style={{ marginTop: 10 }}
                />
                <PrimaryButton label="Edit details" variant="outline" onPress={() => setPhase('confirm')} style={{ marginTop: 10 }} />
              </>
            ) : null}

            {phase === 'send' ? (
              <>
                <Text style={styles.title}>Send to Pharmacy</Text>
                <Text style={styles.meta}>
                  Optional message for the pharmacist. Choose which store should review this photo.
                </Text>
                <Text style={styles.label}>Message (optional)</Text>
                <TextInput
                  style={[styles.input, styles.note]}
                  value={customerNote}
                  onChangeText={setCustomerNote}
                  placeholder="e.g. Need this today if available"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
                <Text style={styles.section}>Pharmacy</Text>
                {stores.map((store) => {
                  const on = store.id === (sendStoreId || selectedStoreId);
                  return (
                    <Pressable
                      key={store.id}
                      style={[styles.choice, on && styles.choiceOn]}
                      onPress={() => {
                        setSendStoreId(store.id);
                        setSelectedStoreId(store.id);
                      }}
                    >
                      <Text style={styles.choiceTitle}>{store.name}</Text>
                      <Text style={styles.meta}>{store.address}</Text>
                    </Pressable>
                  );
                })}
                {busy ? (
                  <View style={styles.progressRow}>
                    <ActivityIndicator color={colors.accentDark} />
                    <Text style={styles.meta}>Uploading… {uploadProgress}%</Text>
                  </View>
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PrimaryButton
                  label={busy ? 'Uploading…' : error ? 'Retry upload' : 'Send photo request'}
                  loading={busy}
                  onPress={() => void sendToPharmacy()}
                  style={{ marginTop: 16 }}
                />
                <PrimaryButton label="Back" variant="outline" onPress={() => setPhase('results')} style={{ marginTop: 10 }} />
              </>
            ) : null}

            {phase === 'done' ? (
              <>
                <Text style={styles.title}>Request sent</Text>
                <Text style={styles.meta}>
                  {doneNumber} is in the pharmacist queue. Track it under My Requests.
                </Text>
                <PrimaryButton label="My Requests" onPress={() => router.push('/prescriptions')} style={{ marginTop: 16 }} />
                <PrimaryButton label="Scan another" variant="outline" onPress={resetCapture} style={{ marginTop: 10 }} />
                <PrimaryButton label="Back home" variant="outline" onPress={() => router.replace('/(tabs)')} style={{ marginTop: 10 }} />
              </>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { backgroundColor: colors.background },
  overlay: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontSize: 18, fontWeight: '700', color: colors.text },
  brandLight: { color: '#fff', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: 10,
  },
  permissionTitle: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  permissionBody: { color: colors.textSecondary, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  frame: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.78,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.accent,
    overflow: 'hidden',
  },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: '#fff' },
  tl: { top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3 },
  statusLight: { marginTop: 16, color: '#fff', textAlign: 'center', fontWeight: '600' },
  errorLight: { marginTop: 8, color: '#FFB4B4', textAlign: 'center' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: '#111',
  },
  sheetContent: { paddingHorizontal: spacing.xl, paddingTop: 12, gap: 8 },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: radii.xl,
    backgroundColor: colors.backgroundAlt,
  },
  title: { marginTop: 8, fontSize: 22, fontWeight: '700', color: colors.text },
  meta: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  section: { marginTop: 12, fontWeight: '700', color: colors.text },
  label: { marginTop: 8, fontWeight: '600', color: colors.text, fontSize: 13 },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  note: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  choice: {
    marginTop: 10,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  choiceOn: { borderColor: colors.borderStrong, backgroundColor: colors.accentSoft },
  choiceTitle: { fontWeight: '700', color: colors.text },
  matchCard: {
    marginTop: 10,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  price: { marginTop: 4, fontWeight: '700', color: colors.text },
  warn: { color: colors.danger, fontWeight: '600', fontSize: 13, marginTop: 6 },
  error: { color: colors.danger, fontWeight: '600', marginTop: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
});
