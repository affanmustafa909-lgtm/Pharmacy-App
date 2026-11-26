import { router } from '@/navigation/router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { changePassword } from '@/lib/api';
import { colors, spacing } from '@/theme';

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <ScreenHeader title="Account settings" />
        <View style={styles.content}>
          <Text style={styles.meta}>Sign in to manage your password.</Text>
          <PrimaryButton label="Sign in" onPress={() => router.push('/auth?returnTo=Profile')} />
        </View>
      </View>
    );
  }

  const onSave = () => {
    setError('');
    setInfo('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    void changePassword({ currentPassword, newPassword })
      .then((result) => {
        setInfo(result.message || 'Password updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not update password');
      })
      .finally(() => setLoading(false));
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScreenHeader title="Account settings" />
      <View style={styles.content}>
        <Text style={styles.section}>Signed in as</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email}</Text>

        <Text style={[styles.section, { marginTop: 20 }]}>Change password</Text>
        <Text style={styles.label}>Current password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="8+ characters"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat new password"
          placeholderTextColor={colors.textMuted}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <PrimaryButton label="Update password" loading={loading} disabled={loading} onPress={onSave} />
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.link}>Back to profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: 8 },
  section: { color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { color: colors.textSecondary, marginBottom: 4 },
  label: { fontWeight: '600', color: colors.text, fontSize: 13, marginTop: 8 },
  input: {
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.text,
  },
  error: { color: colors.danger, fontWeight: '600', marginTop: 4 },
  info: { color: colors.accentDark, fontWeight: '600', marginTop: 4 },
  link: { color: colors.accent, fontWeight: '700', textAlign: 'center' },
});
