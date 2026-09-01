import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { AppCheckbox } from '@/components/AppCheckbox';
import { LegalText } from '@/components/LegalText';
import { Colors } from '@/constants/colors';
import { FontSize, Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, RegisterFormValues } from '@/utils/validation';

export default function RegisterScreen() {
  const { register, isSubmitting } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      agreedToTerms: false as unknown as true,
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    const result = await register(values);
    if (!result.ok) setFormError(result.message);
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Book tickets to Kenya&apos;s best events in a few taps.</Text>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <AppInput
            label="Full name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
            placeholder="Jane Wanjiru"
            autoCapitalize="words"
            autoComplete="name"
          />
        )}
      />
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
      <Controller
        control={control}
        name="phoneNumber"
        render={({ field }) => (
          <AppInput
            label="Phone number"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.phoneNumber?.message}
            placeholder="07XX XXX XXX"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <AppInput
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <AppInput
            label="Confirm password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmPassword?.message}
            placeholder="Re-enter your password"
            secureTextEntry
            autoCapitalize="none"
          />
        )}
      />
      <Controller
        control={control}
        name="agreedToTerms"
        render={({ field }) => (
          <AppCheckbox
            checked={!!field.value}
            onToggle={(checked) => field.onChange(checked)}
            label="I agree to the Terms and Conditions and Privacy Policy"
            error={errors.agreedToTerms?.message}
          />
        )}
      />
      <LegalText
        text="Read the [Terms and Conditions](terms-and-conditions) and [Privacy Policy](privacy-policy)."
        style={styles.legalLinks}
      />

      {!!formError && <Text style={styles.formError}>{formError}</Text>}

      <AppButton
        label="Create account"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        style={styles.submitButton}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/login">
          <Text style={styles.footerLink}>Sign in</Text>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: Spacing.lg, marginBottom: Spacing.xl },
  title: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xs },
  legalLinks: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.md },
  formError: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.md, textAlign: 'center' },
  submitButton: { marginTop: Spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xxl, marginBottom: Spacing.xl },
  footerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  footerLink: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
});
