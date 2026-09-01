import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { normalizeError } from '@/utils/errors';

export default function VerifyEmailScreen() {
  const user = useAuthStore((s) => s.user);
  const refreshCurrentUser = useAuthStore((s) => s.refreshCurrentUser);
  const [isResending, setIsResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleResend() {
    setIsResending(true);
    setNotice(null);
    try {
      const response = await authService.resendVerification();
      setNotice(response.message);
    } catch (error) {
      setNotice(normalizeError(error).message);
    } finally {
      setIsResending(false);
    }
  }

  async function handleIveVerified() {
    await refreshCurrentUser();
    if (user?.emailVerified) router.replace('/(tabs)/home');
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Feather name="mail" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.message}>
          We sent a verification link to{' '}
          <Text style={styles.email}>{user?.email ?? 'your email address'}</Text>. Open it to confirm your account.
        </Text>
        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <AppButton label="I've verified — Continue" onPress={handleIveVerified} style={styles.button} />
        <AppButton
          label="Resend email"
          onPress={handleResend}
          loading={isResending}
          variant="outline"
          style={styles.button}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  message: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  email: { fontWeight: '700', color: Colors.text },
  notice: { fontSize: FontSize.sm, color: Colors.success, textAlign: 'center', marginBottom: Spacing.md },
  button: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xxl },
});
