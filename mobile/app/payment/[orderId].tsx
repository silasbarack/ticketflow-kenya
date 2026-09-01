import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { PaymentStatus } from '@/components/PaymentStatus';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorState } from '@/components/ErrorState';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { PAYMENT_POLL_INTERVAL_MS, PAYMENT_POLL_TIMEOUT_MS } from '@/constants/config';
import { useNetworkRequest } from '@/hooks/useNetworkRequest';
import { useCheckoutStore } from '@/stores/checkout.store';
import { ordersService } from '@/services/orders.service';
import { paymentsService } from '@/services/payments.service';
import { PaymentStatus as PaymentStatusValue, TERMINAL_PAYMENT_STATUSES } from '@/types/payment';
import { normalizeError } from '@/utils/errors';
import { formatCurrency } from '@/utils/currency';
import { formatPhoneForDisplay } from '@/utils/phone';

type Phase = 'confirm' | 'sending' | 'processing' | 'network-error' | 'timeout';

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const buyerPhone = useCheckoutStore((s) => s.buyerPhone);
  const resetCheckout = useCheckoutStore((s) => s.reset);

  const { data: order, isLoading, error, refetch } = useNetworkRequest(() => ordersService.getById(orderId), [orderId]);

  const [phase, setPhase] = useState<Phase>('confirm');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusValue>('PENDING');
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [simulateError, setSimulateError] = useState<string | null>(null);

  const checkoutRequestIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollStartedAtRef.current = Date.now();

    pollIntervalRef.current = setInterval(async () => {
      const checkoutRequestId = checkoutRequestIdRef.current;
      if (!checkoutRequestId) return;

      if (Date.now() - pollStartedAtRef.current >= PAYMENT_POLL_TIMEOUT_MS) {
        stopPolling();
        setPhase('timeout');
        return;
      }

      try {
        const response = await paymentsService.getStatus(checkoutRequestId);
        setPaymentStatus(response.status);

        if (TERMINAL_PAYMENT_STATUSES.includes(response.status)) {
          stopPolling();
          if (response.status === 'PAID') {
            resetCheckout();
            const ticketId = response.ticketIds?.[0];
            router.replace(ticketId ? `/ticket/${ticketId}` : '/(tabs)/tickets');
          }
        }
      } catch {
        stopPolling();
        setPhase('network-error');
      }
    }, PAYMENT_POLL_INTERVAL_MS);
  }, [resetCheckout, stopPolling]);

  async function handleSendStk() {
    if (!order || phase === 'sending') return;
    if (!buyerPhone) {
      setFormError('Missing M-Pesa phone number. Please return to checkout.');
      return;
    }

    setFormError(null);
    setPhase('sending');
    try {
      const response = await paymentsService.stkPush({ orderId: order.id, phoneNumber: buyerPhone });
      checkoutRequestIdRef.current = response.checkoutRequestId;
      setPaymentStatus(response.status);
      setStatusMessage(response.message);
      setPhase('processing');
      startPolling();
    } catch (err) {
      setFormError(normalizeError(err).message);
      setPhase('confirm');
    }
  }

  async function handleSimulateConfirmation() {
    const paymentId = checkoutRequestIdRef.current;
    if (!paymentId) return;
    setSimulateError(null);
    try {
      await paymentsService.simulateSuccess(paymentId);
    } catch (err) {
      // Disabled unless the backend sets ENABLE_MOCK_PAYMENTS=true.
      setSimulateError(normalizeError(err).message);
    }
  }

  function handleResumePolling() {
    if (!checkoutRequestIdRef.current) {
      setPhase('confirm');
      return;
    }
    setPhase('processing');
    startPolling();
  }

  if (isLoading) return <LoadingScreen />;
  if (error || !order) return <ErrorState message={error?.message ?? 'Order not found.'} onRetry={refetch} />;

  if (phase === 'processing') {
    return (
      <ScreenContainer>
        <PaymentStatus status={paymentStatus} message={paymentStatus === 'PENDING' ? statusMessage : undefined} />
        {paymentStatus !== 'PAID' && TERMINAL_PAYMENT_STATUSES.includes(paymentStatus) && (
          <View style={styles.actions}>
            <AppButton label="Try again" onPress={() => setPhase('confirm')} />
            <AppButton label="Return to events" onPress={() => router.replace('/(tabs)/home')} variant="outline" style={styles.secondaryAction} />
          </View>
        )}

        {__DEV__ && paymentStatus === 'PENDING' && (
          <View style={styles.devPanel}>
            <Text style={styles.devNote}>
              Dev only: Safaricom&apos;s callback can&apos;t reach a local backend, so a real sandbox payment stays
              pending. This simulates the confirmation the callback would deliver.
            </Text>
            <AppButton
              label="Simulate M-Pesa confirmation"
              onPress={handleSimulateConfirmation}
              variant="outline"
              size="sm"
            />
            {!!simulateError && <Text style={styles.formError}>{simulateError}</Text>}
          </View>
        )}
      </ScreenContainer>
    );
  }

  if (phase === 'network-error') {
    return (
      <ScreenContainer>
        <ErrorState
          title="Connection lost"
          message="We couldn't check your payment status. Your payment may still be processing."
          onRetry={handleResumePolling}
        />
      </ScreenContainer>
    );
  }

  if (phase === 'timeout') {
    return (
      <ScreenContainer>
        <ErrorState
          title="Still waiting"
          message="This is taking longer than usual. You can keep waiting or check back later from My Tickets."
          onRetry={handleResumePolling}
        />
        <AppButton label="Go to My Tickets" onPress={() => router.replace('/(tabs)/tickets')} variant="ghost" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.heading}>Confirm M-Pesa payment</Text>
      <Text style={styles.subheading}>
        We&apos;ll send a payment prompt to your phone. Enter your M-Pesa PIN there to complete the purchase.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Amount payable</Text>
          <Text style={styles.value}>{formatCurrency(order.totalPayable)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>M-Pesa number</Text>
          <Text style={styles.value}>{buyerPhone ? formatPhoneForDisplay(buyerPhone) : 'Not set'}</Text>
        </View>
      </View>

      {!!formError && <Text style={styles.formError}>{formError}</Text>}

      <AppButton
        label={phase === 'sending' ? 'Sending prompt…' : 'Send M-Pesa Prompt'}
        onPress={handleSendStk}
        loading={phase === 'sending'}
        disabled={phase === 'sending'}
        style={styles.submitButton}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginTop: Spacing.sm },
  subheading: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary },
  value: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  formError: { color: Colors.error, fontSize: FontSize.sm, marginTop: Spacing.md, textAlign: 'center' },
  submitButton: { marginTop: Spacing.xl },
  actions: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  secondaryAction: { marginTop: 0 },
  devPanel: {
    marginTop: Spacing.xxl,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  devNote: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
});
