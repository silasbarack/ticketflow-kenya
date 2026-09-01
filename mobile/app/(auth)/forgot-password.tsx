import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { authService } from '@/services/auth.service';
import { normalizeError } from '@/utils/errors';
import { forgotPasswordSchema, ForgotPasswordFormValues } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const response = await authService.forgotPassword(values);
      setResult(response.message);
    } catch (error) {
      setFormError(normalizeError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <ScreenContainer>
        <View style={styles.successContainer}>
          <View style={styles.iconCircle}>
            <Feather name="mail" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successMessage}>{result}</Text>
          <AppButton label="Back to sign in" onPress={() => router.replace('/(auth)/login')} style={styles.backButton} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>Enter the email on your account and we&apos;ll send you reset instructions.</Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <AppInput
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.email?.message}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        )}
      />

      {!!formError && <Text style={styles.formError}>{formError}</Text>}

      <AppButton label="Send reset link" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.submitButton} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: Spacing.xl, marginBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xs },
  formError: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.md, textAlign: 'center' },
  submitButton: { marginTop: Spacing.sm },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  successMessage: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  backButton: { paddingHorizontal: Spacing.xxl },
});
