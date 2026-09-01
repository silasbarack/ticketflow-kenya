import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { AppCheckbox } from '@/components/AppCheckbox';
import { LegalText } from '@/components/LegalText';
import { OrderSummary } from '@/components/OrderSummary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Colors } from '@/constants/colors';
import { FontSize, Spacing } from '@/constants/spacing';
import { useEvent } from '@/hooks/useEvents';
import { useCheckoutStore } from '@/stores/checkout.store';
import { useAuthStore } from '@/stores/auth.store';
import { ordersService } from '@/services/orders.service';
import { AttendeeForm, AttendeeField } from '@/components/AttendeeForm';
import { ATTENDEE_DETAILS_THRESHOLD, AttendeeInput } from '@/types/order';
import { normalizeError } from '@/utils/errors';
import { attendeeSchema, buyerDetailsSchema, BuyerDetailsFormValues } from '@/utils/validation';
import { normalizeKenyanPhone } from '@/utils/phone';

const EMPTY_ATTENDEE: AttendeeInput = { firstName: '', lastName: '', nationalId: '', email: '', phone: '' };

export default function CheckoutScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { event, isLoading, error, refetch } = useEvent(eventId);
  const user = useAuthStore((s) => s.user);
  const quantities = useCheckoutStore((s) => s.quantities);
  const setBuyerDetails = useCheckoutStore((s) => s.setBuyerDetails);
  const setDraftOrder = useCheckoutStore((s) => s.setDraftOrder);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BuyerDetailsFormValues>({
    resolver: zodResolver(buyerDetailsSchema),
    defaultValues: {
      buyerName: user?.name ?? '',
      buyerEmail: user?.email ?? '',
      buyerPhone: user?.phoneNumber ?? '',
      acceptedTerms: false as unknown as true,
    },
  });

  const selectedItems = useMemo(() => {
    if (!event) return [];
    return event.ticketTypes
      .filter((tier) => (quantities[tier.id] ?? 0) > 0)
      .map((tier) => ({ ticketTypeId: tier.id, ticketTypeName: tier.name, unitPrice: tier.price, quantity: quantities[tier.id] }));
  }, [event, quantities]);

  const totalTickets = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems],
  );

  /** One slot per individual ticket, so each attendee gets their own form. */
  const ticketSlots = useMemo(
    () =>
      selectedItems.flatMap((item) =>
        Array.from({ length: item.quantity }, () => ({ ticketTypeName: item.ticketTypeName })),
      ),
    [selectedItems],
  );

  const needsAttendees = totalTickets >= ATTENDEE_DETAILS_THRESHOLD;

  const [attendees, setAttendees] = useState<AttendeeInput[]>([]);
  const [attendeeErrors, setAttendeeErrors] = useState<Partial<Record<AttendeeField, string>>[]>([]);

  const syncedAttendees = useMemo(
    () => Array.from({ length: ticketSlots.length }, (_, i) => attendees[i] ?? { ...EMPTY_ATTENDEE }),
    [ticketSlots.length, attendees],
  );

  function updateAttendee(index: number, field: AttendeeField, value: string) {
    setAttendees((prev) => {
      const next = Array.from({ length: ticketSlots.length }, (_, i) => prev[i] ?? { ...EMPTY_ATTENDEE });
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  /** Returns the attendee list if every form is valid, otherwise surfaces per-field errors. */
  function collectValidAttendees(): AttendeeInput[] | null {
    const nextErrors: Partial<Record<AttendeeField, string>>[] = [];
    let ok = true;

    syncedAttendees.forEach((attendee, i) => {
      const result = attendeeSchema.safeParse(attendee);
      if (result.success) {
        nextErrors[i] = {};
        return;
      }
      ok = false;
      const fieldErrors: Partial<Record<AttendeeField, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as AttendeeField | undefined;
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      nextErrors[i] = fieldErrors;
    });

    setAttendeeErrors(nextErrors);
    if (!ok) return null;

    return syncedAttendees.map((a) => ({
      ...a,
      phone: normalizeKenyanPhone(a.phone) ?? a.phone,
    }));
  }

  async function onSubmit(values: BuyerDetailsFormValues) {
    if (!event || isSubmitting) return;
    const normalizedPhone = normalizeKenyanPhone(values.buyerPhone);
    if (!normalizedPhone) {
      setFormError('Enter a valid M-Pesa phone number.');
      return;
    }

    // Multi-ticket orders name each attendee; validate before creating anything.
    let validAttendees: AttendeeInput[] | null = null;
    if (needsAttendees) {
      validAttendees = collectValidAttendees();
      if (!validAttendees) {
        setFormError('Please complete the attendee details for every ticket.');
        return;
      }
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      setBuyerDetails({ buyerName: values.buyerName, buyerEmail: values.buyerEmail, buyerPhone: normalizedPhone });

      // Attendees are collected as one flat list but submitted per order item.
      let slotIndex = 0;
      const items = selectedItems.map((item) => {
        const itemAttendees = validAttendees?.slice(slotIndex, slotIndex + item.quantity);
        slotIndex += item.quantity;
        return {
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          ...(itemAttendees ? { attendees: itemAttendees } : {}),
        };
      });

      const order = await ordersService.create({
        eventId: event.id,
        items,
        buyerName: values.buyerName,
        buyerEmail: values.buyerEmail,
        buyerPhone: normalizedPhone,
      });
      setDraftOrder(order);
      router.replace(`/payment/${order.id}`);
    } catch (err) {
      setFormError(normalizeError(err).message);
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (error || !event) return <ErrorState message={error?.message ?? 'Event not found.'} onRetry={refetch} />;
  if (selectedItems.length === 0) {
    return (
      <EmptyState
        icon="shopping-cart"
        title="No tickets selected"
        message="Go back to the event and choose at least one ticket to continue."
        action={<AppButton label="Back to event" onPress={() => router.replace(`/events/${event.id}`)} fullWidth={false} />}
      />
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventMeta}>
        {event.venue}, {event.city}
      </Text>

      <View style={styles.summarySpacing}>
        <OrderSummary lines={selectedItems} />
      </View>

      <Text style={styles.sectionTitle}>Buyer details</Text>
      <Controller
        control={control}
        name="buyerName"
        render={({ field }) => (
          <AppInput
            label="Full name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.buyerName?.message}
            placeholder="Jane Wanjiru"
            autoCapitalize="words"
            autoComplete="name"
          />
        )}
      />
      <Controller
        control={control}
        name="buyerEmail"
        render={({ field }) => (
          <AppInput
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.buyerEmail?.message}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        )}
      />
      <Controller
        control={control}
        name="buyerPhone"
        render={({ field }) => (
          <AppInput
            label="M-Pesa phone number"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.buyerPhone?.message}
            placeholder="07XX XXX XXX"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        )}
      />
      {needsAttendees && (
        <>
          <Text style={styles.sectionTitle}>Attendee details</Text>
          <Text style={styles.sectionHint}>
            You&apos;re buying {totalTickets} tickets, so each one is issued to a named attendee. These details are
            printed on the ticket and checked at the gate.
          </Text>
          {ticketSlots.map((slot, i) => (
            <AttendeeForm
              key={i}
              index={i + 1}
              ticketTypeName={slot.ticketTypeName}
              value={syncedAttendees[i]}
              errors={attendeeErrors[i]}
              onChange={(field, text) => updateAttendee(i, field, text)}
            />
          ))}
        </>
      )}

      <Controller
        control={control}
        name="acceptedTerms"
        render={({ field }) => (
          <AppCheckbox
            checked={!!field.value}
            onToggle={(checked) => field.onChange(checked)}
            label="I agree to the refund policy and Terms and Conditions"
            error={errors.acceptedTerms?.message}
          />
        )}
      />
      <LegalText
        text="Read the [Ticket Purchase Policy](ticket-purchase-policy), [Payment Policy](payment-policy) and [Terms and Conditions](terms-and-conditions)."
        style={styles.legalLinks}
      />

      {!!formError && <Text style={styles.formError}>{formError}</Text>}

      <AppButton
        label={isSubmitting ? 'Creating order…' : 'Continue to Payment'}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.submitButton}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eventTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginTop: Spacing.sm },
  eventMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.lg },
  summarySpacing: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  sectionHint: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, marginBottom: Spacing.md },
  legalLinks: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.md },
  formError: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.md, textAlign: 'center' },
  submitButton: { marginTop: Spacing.sm, marginBottom: Spacing.xl },
});
