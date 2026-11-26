import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CapsuleHero } from '@/components/CapsuleHero';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { forgotPassword, resetPassword, type ApiError } from '@/lib/api';
import { loadAuthProviders, type AuthProviders } from '@/lib/authProviders';
import type { RootStackParamList } from '@/navigation/types';
import { colors, typography } from '@/theme';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

const SIDE = 24;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  code?: string;
};

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Auth'>>();
  const { signIn, signUp, user } = useApp();
  const returnTo = route.params?.returnTo ?? 'Checkout';
  const initialMode = route.params?.mode === 'signup' ? 'signup' : 'signin';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [providers, setProviders] = useState<AuthProviders>({
    password: true,
    google: false,
    apple: false,
  });

  useEffect(() => {
    void loadAuthProviders().then(setProviders);
  }, []);

  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setOtpSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [otpExpiresAt]);

  const goNext = () => {
    if (returnTo === 'Tabs') {
      navigation.replace('Tabs', { screen: 'index' });
      return;
    }
    if (returnTo === 'Profile') {
      navigation.replace('Tabs', { screen: 'profile' });
      return;
    }
    navigation.replace(returnTo);
  };

  // If already signed in when opening this screen, continue — do not loop back here.
  useEffect(() => {
    if (user) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on initial auth presence
  }, [user]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (mode === 'signup' && name.trim().length < 2) {
      next.name = 'Enter your full name.';
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = 'Email is required.';
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      next.email = 'Enter a valid email address.';
    }
    if (mode === 'reset' && !code.trim()) {
      next.code = 'Enter the 6-digit code from your email.';
    }
    if (mode !== 'forgot') {
      if (!password) {
        next.password = 'Password is required.';
      } else if (password.length < 8) {
        next.password = 'Password must be at least 8 characters.';
      }
    }
    return next;
  };

  const finish = async () => {
    if (loading) return;
    const nextErrors = validate();
    setFieldErrors(nextErrors);
    setError('');
    setInfo('');
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      if (mode === 'forgot') {
        const result = await forgotPassword(email.trim());
        const minutes = result.expiresInMinutes ?? 15;
        setOtpExpiresAt(Date.now() + minutes * 60 * 1000);
        setInfo(
          result.devCode
            ? `${result.message} Dev code: ${result.devCode}`
            : `${result.message} Code expires in ${minutes} minutes.`,
        );
        setMode('reset');
        return;
      }
      if (mode === 'reset') {
        if (otpExpiresAt && Date.now() > otpExpiresAt) {
          setError('Reset code expired. Request a new code.');
          return;
        }
        await resetPassword({ email: email.trim(), code: code.trim(), password });
        setInfo('Password updated. Sign in with your new password.');
        setPassword('');
        setCode('');
        setOtpExpiresAt(null);
        setMode('signin');
        return;
      }
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone || undefined,
        });
      }
      goNext();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (mode === 'signin' && (apiErr.code === 'USER_NOT_FOUND' || /no account found/i.test(apiErr.message || ''))) {
        setError('No account found. Please sign up first.');
      } else if (mode === 'reset' && /invalid or expired/i.test(apiErr.message || '')) {
        setError('Reset code is invalid or expired. Request a new code.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not complete that request');
      }
    } finally {
      setLoading(false);
    }
  };

  const oauthUnavailable = (provider: 'google' | 'apple') => {
    setError(
      provider === 'google'
        ? 'Google sign-in is not configured on this build.'
        : 'Apple sign-in is not available on this device.',
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.wordmark}>Hera</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.title}>
          {mode === 'signin'
            ? 'Sign in to Hera'
            : mode === 'signup'
              ? 'Create your Hera account'
              : mode === 'forgot'
                ? 'Forgot password'
                : 'Set a new password'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'signin'
            ? 'Sign in to continue to checkout.'
            : mode === 'signup'
              ? 'Save your cart and check out faster.'
              : mode === 'forgot'
                ? 'We will email a one-time code that expires in 15 minutes.'
                : 'Enter the code and choose a new password.'}
        </Text>

        <CapsuleHero />

        {providers.google ? (
          <PrimaryButton
            label="Sign in with Google"
            icon="logo-google"
            onPress={() => oauthUnavailable('google')}
            style={styles.oauthGap}
          />
        ) : null}
        {providers.apple ? (
          <PrimaryButton
            label="Sign in with Apple"
            icon="logo-apple"
            variant="outline"
            onPress={() => oauthUnavailable('apple')}
            style={styles.oauthGap}
          />
        ) : null}

        {providers.password ? (
          <View style={styles.form}>
            {mode === 'signup' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={[styles.input, fieldErrors.name ? styles.inputError : null]}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
                  }}
                  autoCapitalize="words"
                />
                {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, fieldErrors.email ? styles.inputError : null]}
                placeholder="you@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
            </View>

            {mode === 'signup' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Phone (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            ) : null}

            {mode === 'reset' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Reset code</Text>
                <TextInput
                  style={[styles.input, fieldErrors.code ? styles.inputError : null]}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.textMuted}
                  value={code}
                  onChangeText={(v) => {
                    setCode(v);
                    if (fieldErrors.code) setFieldErrors((e) => ({ ...e, code: undefined }));
                  }}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                {fieldErrors.code ? <Text style={styles.fieldError}>{fieldErrors.code}</Text> : null}
              </View>
            ) : null}

            {mode !== 'forgot' ? (
              <View style={styles.field}>
                <Text style={styles.label}>{mode === 'reset' ? 'New password' : 'Password'}</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      fieldErrors.password ? styles.inputError : null,
                    ]}
                    placeholder="8+ characters"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
                {fieldErrors.password ? (
                  <Text style={styles.fieldError}>{fieldErrors.password}</Text>
                ) : null}
              </View>
            ) : null}

            {mode === 'signin' ? (
              <Pressable
                onPress={() => {
                  setError('');
                  setInfo('');
                  setFieldErrors({});
                  setMode('forgot');
                }}
                hitSlop={8}
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            ) : null}

            {info ? <Text style={styles.info}>{info}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {mode === 'reset' && otpExpiresAt ? (
              <Text style={styles.info}>
                {otpSecondsLeft > 0
                  ? `Code expires in ${Math.floor(otpSecondsLeft / 60)}:${String(otpSecondsLeft % 60).padStart(2, '0')}`
                  : 'Code expired. Resend a new code.'}
              </Text>
            ) : null}
            {mode === 'reset' ? (
              <Pressable
                disabled={loading}
                onPress={() => {
                  setMode('forgot');
                  setError('');
                  setInfo('');
                  setCode('');
                  void (async () => {
                    setLoading(true);
                    try {
                      const result = await forgotPassword(email.trim());
                      const minutes = result.expiresInMinutes ?? 15;
                      setOtpExpiresAt(Date.now() + minutes * 60 * 1000);
                      setInfo(
                        result.devCode
                          ? `New code sent. Dev code: ${result.devCode}`
                          : `New code sent. Expires in ${minutes} minutes.`,
                      );
                      setMode('reset');
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Could not resend code');
                    } finally {
                      setLoading(false);
                    }
                  })();
                }}
                hitSlop={8}
              >
                <Text style={styles.forgotLink}>Resend code</Text>
              </Pressable>
            ) : null}

            <PrimaryButton
              label={
                mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                    ? 'Create account'
                    : mode === 'forgot'
                      ? 'Send reset code'
                      : 'Update password'
              }
              loading={loading}
              disabled={loading}
              onPress={() => void finish()}
              style={styles.submit}
            />
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            setError('');
            setInfo('');
            setFieldErrors({});
            setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
          }}
          style={styles.switchRow}
        >
          <Text style={styles.switchText}>
            {mode === 'signin' || mode === 'forgot' || mode === 'reset'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <Text style={styles.switchLink}>
              {mode === 'signin' || mode === 'forgot' || mode === 'reset' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: SIDE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
  },
  backText: {
    ...typography.caption,
    color: colors.text,
    marginLeft: 2,
  },
  wordmark: {
    ...typography.brand,
    color: colors.text,
  },
  headerSpacer: {
    minWidth: 72,
  },
  content: {
    paddingHorizontal: SIDE,
    paddingTop: 4,
  },
  title: {
    ...typography.title,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    marginTop: 6,
    marginBottom: 4,
  },
  oauthGap: {
    marginTop: 8,
  },
  form: {
    marginTop: 4,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    height: 50,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: colors.danger,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 46,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 50,
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  info: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: '600',
  },
  forgotLink: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
    alignSelf: 'flex-end',
  },
  submit: {
    marginTop: 4,
    backgroundColor: colors.primary,
  },
  switchRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  switchLink: {
    color: colors.accent,
    fontWeight: '700',
  },
});
