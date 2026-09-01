import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { EventItem, isSoldOut, lowestPrice } from '@/types/event';
import { resolvePosterSource } from '@/data/poster-assets';
import { formatEventDate } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';
import { AppButton } from './AppButton';

interface EventCardProps {
  event: EventItem;
}

export function EventCard({ event }: EventCardProps) {
  const soldOut = isSoldOut(event);
  const from = lowestPrice(event);
  const externalBookingUrl = event.bookingMode === 'EXTERNAL' ? event.bookingUrl : null;

  const handleBookNow = () => {
    if (externalBookingUrl) {
      void Linking.openURL(externalBookingUrl);
      return;
    }
    router.push(`/events/${event.id}`);
  };

  return (
    <Pressable
      onPress={() => router.push(`/events/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`View ${event.title}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={resolvePosterSource(event.posterUrl)} style={styles.poster} contentFit="cover" transition={150} />

      <View style={styles.badgeRow}>
        <View style={[styles.badge, soldOut ? styles.badgeSoldOut : styles.badgeAvailable]}>
          <Text style={styles.badgeText}>{soldOut ? 'Sales Closed' : 'Tickets Available'}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.metaRow}>
          <Feather name="calendar" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {formatEventDate(event.startsAt)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.venue}, {event.city}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.price}>{from !== undefined ? `From ${formatCurrency(from)}` : 'Tickets TBA'}</Text>
        </View>

        <AppButton
          label={externalBookingUrl ? 'Book Now' : soldOut ? 'View Event' : 'Book Now'}
          onPress={handleBookNow}
          variant={soldOut ? 'secondary' : 'primary'}
          size="sm"
          style={styles.bookButton}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.92 },
  poster: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: Colors.border,
  },
  badgeRow: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  badgeAvailable: { backgroundColor: Colors.success },
  badgeSoldOut: { backgroundColor: Colors.text },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  body: {
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  footerRow: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  price: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.text,
  },
  bookButton: {
    marginTop: 0,
  },
});
