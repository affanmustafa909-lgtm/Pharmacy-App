import { Haptics } from '@/lib/haptics';
import { router } from '@/navigation/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { CircleButton } from '@/components/CircleButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductVisual } from '@/components/ProductVisual';
import { useApp } from '@/context/AppContext';
import { submitPrescription } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { colors, radii, shadows, spacing } from '@/theme';

type Phase = 'permission' | 'aim' | 'reading' | 'analyzed';

const SCANNED_TEXT =
  'Patient: Michael Johnson\nMedicine: Yakapsule 500mg\nSig: 1 tablet up to 3 times daily for 5 days\nPrescriber: Dr. Helen Cho';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const [permission, setPermission] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [phase, setPhase] = useState<Phase>('permission');
  const [progress, setProgress] = useState(0);
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');
  const scanLine = useSharedValue(0);

  const { products, selectedStoreId, setPrescriptionNumber } = useApp();
  const recommended = useMemo(() => products.slice(0, 2), [products]);

  useEffect(() => {
    const status = Camera.getCameraPermissionStatus();
    if (status === 'granted') {
      setPermission('granted');
      setPhase((prev) => (prev === 'permission' ? 'aim' : prev));
      return;
    }
    setPermission('denied');
  }, []);

  const requestPermission = async () => {
    const status = await Camera.requestCameraPermission();
    if (status === 'granted') {
      setPermission('granted');
      setPhase('aim');
      return;
    }
    setPermission('denied');
  };

  useEffect(() => {
    scanLine.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [scanLine]);

  useEffect(() => {
    if (phase !== 'reading') return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((prev) => Math.min(100, prev + 4));
    }, 70);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'reading' && progress >= 100) {
      setPhase('analyzed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [phase, progress]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLine.value * 220 - 110 }],
  }));

  const startAnalysis = (uri?: string | null) => {
    if (uri) setCapturedUri(uri);
    setPhase('reading');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const takePhoto = async () => {
    if (capturing) return;
    try {
      setCapturing(true);
      if (!cameraRef.current || !device) {
        startAnalysis(null);
        return;
      }
      const photo = await cameraRef.current.takePhoto({
        flash: flash ? 'on' : 'off',
      });
      startAnalysis(photo?.path ? `file://${photo.path}` : null);
    } catch {
      startAnalysis(null);
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
    if (!result.didCancel && result.assets?.[0]?.uri) {
      startAnalysis(result.assets[0].uri);
    }
  };

  if (permission === 'loading') {
    return <View style={styles.screen} />;
  }

  if (permission !== 'granted') {
    return (
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
            Hera uses your camera to scan prescriptions and recommend medicines.
          </Text>
          <PrimaryButton label="Enable Camera" onPress={requestPermission} />
          <PrimaryButton
            label="Upload from Gallery"
            variant="outline"
            onPress={pickFromGallery}
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Live camera background */}
      {(phase === 'aim' || phase === 'reading') && device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo
          torch={flash ? 'on' : 'off'}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.darkBg]} />
      )}

      {/* Dim overlay */}
      <View style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="none" />

      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <CircleButton
            icon="chevron-back"
            backgroundColor="rgba(255,255,255,0.88)"
            onPress={() => router.back()}
          />
          <Text style={[styles.brand, styles.brandLight]}>Hera</Text>
          <CircleButton
            icon="ellipsis-horizontal"
            backgroundColor="rgba(255,255,255,0.88)"
            onPress={() => {}}
          />
        </View>

        {phase === 'aim' ? (
          <Animated.View entering={FadeIn} style={styles.hintWrap}>
            <View style={styles.hint}>
              <Ionicons name="document-text-outline" size={14} color="#fff" />
              <Text style={styles.hintText}>Point at your prescription</Text>
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.stage}>
          <View style={styles.frame}>
            {capturedUri ? (
              <Image source={{ uri: capturedUri }} style={styles.capture} resizeMode="cover" />
            ) : null}

            {/* Prescription recognition overlay during/after capture */}
            {(phase === 'reading' || phase === 'analyzed') && (
              <View style={styles.rxOverlay}>
                <Text style={styles.clinic}>NYC Medical Center</Text>
                <Text style={styles.patient}>PATIENT: Michael Johnson · AGE 34</Text>
                <Text style={[styles.hand, styles.concernBox]}>c/o Headache, mild fever</Text>
                <Text style={[styles.hand, styles.medicineBox]}>Yakapsule 500mg</Text>
                <Text style={[styles.hand, phase === 'analyzed' && styles.doseBox]}>
                  1 tab · 3x a day · 5 days
                </Text>
                <Text style={[styles.hand, phase === 'analyzed' && styles.suppBox]}>
                  Women Multivitamin once daily
                </Text>
              </View>
            )}

            {phase === 'reading' ? (
              <Animated.View style={[styles.scanBeam, lineStyle]} />
            ) : null}

            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          {phase === 'reading' ? (
            <Text style={styles.status}>
              Reading handwriting... We are analyzing your prescription
            </Text>
          ) : phase === 'aim' ? (
            <Text style={styles.status}>
              Align the prescription inside the frame, then tap capture
            </Text>
          ) : null}
        </View>

        {phase === 'analyzed' ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={styles.check}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
              <Text style={styles.sheetTitle}>Prescription analyzed</Text>
            </View>

            <Text style={styles.recommend}>Scanned text</Text>
            <Text style={styles.productMeta}>{SCANNED_TEXT}</Text>
            <Text style={[styles.recommend, { marginTop: 12 }]}>Pharmacist-verified items</Text>
            <Text style={styles.productMeta}>Waiting for pharmacist review</Text>

            <View style={styles.chips}>
              <Chip
                label="Concern · Headache"
                backgroundColor={colors.chipOrange}
                textColor={colors.chipOrangeText}
              />
              <Chip
                label="Yakapsule"
                backgroundColor={colors.chipTeal}
                textColor={colors.chipTealText}
              />
              <Chip
                label="3x a day"
                backgroundColor={colors.chipPurple}
                textColor={colors.chipPurpleText}
              />
            </View>

            <Text style={styles.recommend}>Suggested from catalog</Text>
            <ScrollView
              style={{ maxHeight: 220 }}
              showsVerticalScrollIndicator={false}
            >
              {recommended.map((product, index) => (
                <Pressable
                  key={product.id}
                  onPress={() => router.push(`/product/${product.id}`)}
                  style={[styles.productRow, shadows.soft]}
                >
                  <ProductVisual product={product} compact style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>
                      {product.unitLabel} · In stock
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatMoney(product.price)}
                    </Text>
                  </View>
                  <View style={styles.match}>
                    <Text style={styles.matchText}>
                      {index === 0 ? '96%' : '98%'} match
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {sendMsg ? <Text style={styles.productMeta}>{sendMsg}</Text> : null}
            <PrimaryButton
              label={sending ? 'Sending…' : 'Send to pharmacist'}
              loading={sending}
              onPress={() => {
                if (!capturedUri || !selectedStoreId || sending) return;
                setSending(true);
                setSendMsg('');
                void submitPrescription({
                  storeId: selectedStoreId,
                  imageUri: capturedUri,
                  scannedText: SCANNED_TEXT,
                  medicineName: 'Yakapsule 500mg',
                  customerNote: 'Uploaded from Hera scan',
                })
                  .then((prescription) => {
                    setPrescriptionNumber(null);
                    setSendMsg(`${prescription.number} sent for pharmacist review.`);
                  })
                  .catch((error: unknown) => {
                    setSendMsg(error instanceof Error ? error.message : 'Could not send prescription');
                  })
                  .finally(() => setSending(false));
              }}
              style={{ marginTop: spacing.md }}
            />
            <PrimaryButton
              label="Prescription history"
              variant="outline"
              onPress={() => router.push('/prescriptions')}
              style={{ marginTop: 10 }}
            />
            <PrimaryButton
              label="Talk to pharmacist"
              variant="outline"
              onPress={() => router.push('/(tabs)/ai')}
              style={{ marginTop: 10 }}
            />
            <PrimaryButton
              label="Scan again"
              variant="outline"
              onPress={() => {
                setCapturedUri(null);
                setProgress(0);
                setSendMsg('');
                setPhase('aim');
              }}
              style={{ marginTop: 10 }}
            />
          </Animated.View>
        ) : (
          <View
            style={[
              styles.controls,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <CircleButton
              icon="images-outline"
              size={48}
              backgroundColor="rgba(255,255,255,0.92)"
              onPress={pickFromGallery}
            />
            {phase === 'reading' ? (
              <View style={[styles.progressCircle, shadows.medium]}>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
            ) : (
              <Pressable
                onPress={takePhoto}
                disabled={capturing}
                style={({ pressed }) => [
                  styles.shutter,
                  shadows.medium,
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <View style={styles.shutterInner} />
              </Pressable>
            )}
            <CircleButton
              icon={flash ? 'flash' : 'flash-off-outline'}
              size={48}
              backgroundColor="rgba(255,255,255,0.92)"
              onPress={() => setFlash((v) => !v)}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111',
  },
  centered: {
    backgroundColor: colors.background,
  },
  darkBg: {
    backgroundColor: '#1A1A1A',
  },
  dim: {
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  overlay: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  brandLight: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 6,
  },
  hintWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30,30,30,0.72)',
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  hintText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  frame: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.78,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.accent,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  capture: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  rxOverlay: {
    ...StyleSheet.absoluteFill,
    padding: 16,
    backgroundColor: 'rgba(250,250,247,0.92)',
  },
  clinic: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  patient: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  hand: {
    marginTop: 10,
    fontSize: 15,
    fontStyle: 'italic',
    color: '#334155',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  concernBox: { backgroundColor: colors.chipOrange },
  medicineBox: { backgroundColor: colors.chipTeal },
  doseBox: { backgroundColor: colors.chipPurple },
  suppBox: { backgroundColor: colors.chipPink },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#fff',
  },
  tl: { top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3 },
  scanBeam: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.9,
  },
  status: {
    marginTop: spacing.lg,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    paddingHorizontal: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.xl,
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  progressCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  progressText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
    ...shadows.float,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D4',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  recommend: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
  },
  thumb: {
    width: 64,
    minHeight: 64,
  },
  productName: {
    fontWeight: '700',
    color: colors.text,
  },
  productMeta: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },
  productPrice: {
    marginTop: 4,
    fontWeight: '700',
    color: colors.text,
  },
  match: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  matchText: {
    color: colors.accentDark,
    fontWeight: '700',
    fontSize: 12,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  permissionBody: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
});
