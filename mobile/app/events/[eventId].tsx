import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { useEvent } from '@/hooks/useEvents';
import { useCheckoutStore } from '@/stores/checkout.store';
import { TicketTierCard } from '@/components/TicketTierCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorState } from '@/components/ErrorState';
import { AppButton } from '@/components/AppButton';
import { resolvePosterSource } from '@/data/poster-assets';
import { formatEventDate, formatEventTime } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';
import { isTierAvailable, TicketType } from '@/types/event';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { event, isLoading, error, refetch } = useEvent(eventId);
  const setEvent = useCheckoutStore((s) => s.setEvent);
  const quantities = useCheckoutStore((s) => s.quantities);
  const setQuantity = useCheckoutStore((s) => s.setQuantity);
  const isExternal = event?.bookingMode === 'EXTERNAL';

  useEffect(() => {
    if (event && event.bookingMode === 'INTERNAL') setEvent(event);
  }, [event, setEvent]);

  const { totalTickets, totalAmount } = useMemo(() => {
    if (!event) return { totalTickets: 0, totalAmount: 0 };
    let tickets = 0;
    let amount = 0;
    for (const tier of event.ticketTypes) {
      const qty = quantities[tier.id] ?? 0;
      tickets += qty;
      amount += qty * tier.price;
    }
    return { totalTickets: tickets, totalAmount: amount };
  }, [event, quantities]);

  if (isLoading) return <LoadingScreen />;
  if (error || !event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ErrorState message={error?.message ?? 'Event not found.'} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.posterWrap}>
          <Image source={resolvePosterSource(event.posterUrl)} style={styles.poster} contentFit="cover" transition={150} />
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color={Colors.white} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.category}>{event.category}</Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.organizer}>By {event.organizerName}</Text>

          <View style={styles.infoCard}>
            <InfoRow icon="calendar" primary={formatEventDate(event.startsAt)} secondary={formatEventTime(event.startsAt)} />
            <InfoRow icon="map-pin" primary={event.venue} secondary={event.city} />
          </View>

          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.description}>{event.description}</Text>

          {isExternal ? (
            <View style={styles.refundCard}>
              <Feather name="external-link" size={16} color={Colors.textSecondary} />
              <View style={styles.sourceCopy}>
                <Text style={styles.refundText}>
                  Booking and payment are completed by the official seller. Its terms, availability and refund
                  policy apply.
                </Text>
                {!!event.verificationSourceUrl && (
                  <Pressable onPress={() => void Linking.openURL(event.verificationSourceUrl!)}>
                    <Text style={styles.sourceLink}>
                      Verified via {event.verificationSource ?? 'official listing'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.refundCard}>
              <Feather name="info" size={16} color={Colors.textSecondary} />
              <Text style={styles.refundText}>
                Tickets are refundable up to 48 hours before the event if it is cancelled or rescheduled by the
                organizer. Otherwise, all sales are final.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{isExternal ? 'Ticket options' : 'Select tickets'}</Text>
          {event.ticketTypes.length === 0 ? (
            <Text style={styles.description}>Ticket sales for this event haven&apos;t opened yet.</Text>
          ) : isExternal ? (
            event.ticketTypes.map((tier) => <ExternalTicketTier key={tier.id} tier={tier} />)
          ) : (
            event.ticketTypes.map((tier) => (
              <TicketTierCard
                key={tier.id}
                tier={tier}
                quantity={quantities[tier.id] ?? 0}
                onChange={(qty) => setQuantity(tier.id, qty)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerCount}>
            {isExternal
              ? 'Official seller checkout'
              : totalTickets > 0
                ? `${totalTickets} ticket${totalTickets > 1 ? 's' : ''}`
                : 'Select tickets'}
          </Text>
          {!isExternal && totalTickets > 0 && <Text style={styles.footerAmount}>{formatCurrency(totalAmount)}</Text>}
        </View>
        {isExternal ? (
          <AppButton
            label="Book Now"
            onPress={() => event.bookingUrl && void Linking.openURL(event.bookingUrl)}
            disabled={!event.bookingUrl}
            fullWidth={false}
            accessibilityHint="Opens the official ticket seller"
            style={styles.footerButton}
          />
        ) : (
          <AppButton
            label="Continue"
            onPress={() => router.push(`/checkout/${event.id}`)}
            disabled={totalTickets === 0}
            fullWidth={false}
            style={styles.footerButton}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function tierAvailabilityLabel(tier: TicketType): string {
  if (tier.availabilityStatus === 'SOLD_OUT') return 'Sold out';
  if (tier.availabilityStatus === 'CLOSED') return 'Closed';
  if (tier.availabilityStatus === 'NOT_YET_ON_SALE') return 'Not yet on sale';
  if (tier.salesStart && new Date() < new Date(tier.salesStart)) return 'Not yet on sale';
  if (tier.salesEnd && new Date() > new Date(tier.salesEnd)) return 'Closed';
  return 'Available';
}

function ExternalTicketTier({ tier }: { tier: TicketType }) {
  const available = isTierAvailable(tier);
  return (
    <View style={[styles.externalTier, !available && styles.externalTierInactive]}>
      <View style={styles.externalTierInfo}>
        <Text style={styles.externalTierName}>{tier.name}</Text>
        {!!tier.description && <Text style={styles.externalTierDescription}>{tier.description}</Text>}
      </View>
      <View style={styles.externalTierPriceBlock}>
        <Text style={styles.externalTierPrice}>{formatCurrency(tier.price)}</Text>
        <Text style={[styles.externalTierStatus, available && styles.externalTierAvailable]}>
          {tierAvailabilityLabel(tier)}
        </Text>
      </View>
    </View>
  );
}

function InfoRow({ icon, primary, secondary }: { icon: keyof typeof Feather.glyphMap; primary: string; secondary: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconCircle}>
        <Feather name={icon} size={16} color={Colors.primary} />
      </View>
      <View>
        <Text style={styles.infoPrimary}>{primary}</Text>
        <Text style={styles.infoSecondary}>{secondary}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing.xxxl },
  posterWrap: { position: 'relative' },
  poster: { width: '100%', aspectRatio: 4 / 3, backgroundColor: Colors.border },
  backButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.lg },
  category: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.xs },
  organizer: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  infoCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPrimary: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  infoSecondary: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 21 },
  refundCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  refundText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  sourceCopy: { flex: 1 },
  sourceLink: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', marginTop: Spacing.xs },
  externalTier: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  externalTierInactive: { opacity: 0.55 },
  externalTierInfo: { flex: 1 },
  externalTierName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  externalTierDescription: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  externalTierPriceBlock: { alignItems: 'flex-end' },
  externalTierPrice: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  externalTierStatus: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  externalTierAvailable: { color: Colors.success, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerInfo: { flex: 1 },
  footerCount: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  footerAmount: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: 2 },
  footerButton: { paddingHorizontal: Spacing.xxl },
});
