import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { EventItem, lowestPrice } from '@/types/event';
import { resolvePosterSource } from '@/data/poster-assets';
import { formatEventDate } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';

interface FeaturedEventCardProps {
  event: EventItem;
}

const CARD_WIDTH = 260;

export function FeaturedEventCard({ event }: FeaturedEventCardProps) {
  const from = lowestPrice(event);

  return (
    <Pressable
      onPress={() => router.push(`/events/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`View featured event ${event.title}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={resolvePosterSource(event.posterUrl)} style={styles.poster} contentFit="cover" transition={150} />
      <View style={styles.overlay} />
      <View style={styles.featuredBadge}>
        <Text style={styles.featuredBadgeText}>Featured</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.meta}>{formatEventDate(event.startsAt)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {event.venue}, {event.city}
        </Text>
        {from !== undefined && <Text style={styles.price}>From {formatCurrency(from)}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 320,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.text,
  },
  pressed: { opacity: 0.92 },
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
  },
  featuredBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  featuredBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  meta: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  price: {
    marginTop: Spacing.xs,
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.white,
  },
});
