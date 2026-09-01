import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { Ticket, TicketStatus } from '@/types/ticket';
import { formatEventDate } from '@/utils/date';

interface TicketCardProps {
  ticket: Ticket;
}

const STATUS_STYLES: Record<TicketStatus, { bg: string; fg: string; label: string }> = {
  VALID: { bg: Colors.successLight, fg: Colors.success, label: 'Upcoming' },
  USED: { bg: Colors.border, fg: Colors.textSecondary, label: 'Used' },
  VOID: { bg: Colors.errorLight, fg: Colors.error, label: 'Void' },
  REFUNDED: { bg: Colors.warningLight, fg: Colors.warning, label: 'Refunded' },
  CANCELLED: { bg: Colors.errorLight, fg: Colors.error, label: 'Cancelled' },
};

export function TicketCard({ ticket }: TicketCardProps) {
  const statusStyle = STATUS_STYLES[ticket.status];

  return (
    <Pressable
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`View ticket for ${ticket.event.title}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {ticket.event.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.fg }]}>{statusStyle.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Feather name="calendar" size={13} color={Colors.textSecondary} />
        <Text style={styles.metaText}>{formatEventDate(ticket.event.startsAt)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Feather name="map-pin" size={13} color={Colors.textSecondary} />
        <Text style={styles.metaText} numberOfLines={1}>
          {ticket.event.venue}, {ticket.event.city}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View>
          <Text style={styles.tierLabel}>{ticket.ticketType.name}</Text>
          <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
        </View>
        <View style={styles.viewAction}>
          <Text style={styles.viewActionText}>View Ticket</Text>
          <Feather name="chevron-right" size={16} color={Colors.primary} />
        </View>
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
    padding: Spacing.md,
  },
  pressed: { opacity: 0.9 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  ticketNumber: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewActionText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});
