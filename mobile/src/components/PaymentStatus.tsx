import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { PaymentStatus as PaymentStatusValue } from '@/types/payment';

interface PaymentStatusProps {
  status: PaymentStatusValue;
  message?: string;
}

const PRESENTATION: Record<PaymentStatusValue, { icon: keyof typeof Feather.glyphMap; color: string; bg: string; title: string }> = {
  PENDING: { icon: 'smartphone', color: Colors.primary, bg: Colors.primaryLight, title: 'Waiting for M-Pesa PIN' },
  PAID: { icon: 'check-circle', color: Colors.success, bg: Colors.successLight, title: 'Payment successful' },
  FAILED: { icon: 'x-circle', color: Colors.error, bg: Colors.errorLight, title: 'Payment declined' },
  CANCELLED: { icon: 'slash', color: Colors.warning, bg: Colors.warningLight, title: 'Payment cancelled' },
  EXPIRED: { icon: 'clock', color: Colors.warning, bg: Colors.warningLight, title: 'Payment request expired' },
  REFUNDED: { icon: 'rotate-ccw', color: Colors.warning, bg: Colors.warningLight, title: 'Payment refunded' },
};

export function PaymentStatus({ status, message }: PaymentStatusProps) {
  const [pulse] = useState(() => new Animated.Value(1));
  const presentation = PRESENTATION[status];
  const isPending = status === 'PENDING';

  useEffect(() => {
    if (!isPending) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isPending, pulse]);

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLabel={presentation.title}>
      <Animated.View
        style={[styles.iconCircle, { backgroundColor: presentation.bg }, isPending && { transform: [{ scale: pulse }] }]}
      >
        <Feather name={presentation.icon} size={40} color={presentation.color} />
      </Animated.View>
      <Text style={styles.title}>{presentation.title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
