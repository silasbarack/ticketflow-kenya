import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorState } from '@/components/ErrorState';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { useNetworkRequest } from '@/hooks/useNetworkRequest';
import { ticketsService } from '@/services/tickets.service';
import { TicketStatus } from '@/types/ticket';
import { resolvePosterSource } from '@/data/poster-assets';
import { formatEventDateTime } from '@/utils/date';
import { normalizeError } from '@/utils/errors';

const STATUS_PRESENTATION: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  VALID: { label: 'Valid — ready to scan', color: Colors.success, bg: Colors.successLight },
  USED: { label: 'Already used', color: Colors.textSecondary, bg: Colors.border },
  VOID: { label: 'Void', color: Colors.error, bg: Colors.errorLight },
  REFUNDED: { label: 'Refunded', color: Colors.warning, bg: Colors.warningLight },
  CANCELLED: { label: 'Cancelled', color: Colors.error, bg: Colors.errorLight },
};

export default function TicketDetailsScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { data: ticket, isLoading, error, refetch } = useNetworkRequest(() => ticketsService.getById(ticketId), [ticketId]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDownloadOrShare(dialogTitle: string) {
    if (!ticket) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      const uri = await ticketsService.downloadDocument(ticket.id);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { dialogTitle });
      } else {
        setActionError('Sharing is not available on this device. The ticket was saved locally.');
      }
    } catch (err) {
      setActionError(normalizeError(err).message);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (error || !ticket) return <ErrorState message={error?.message ?? 'Ticket not found.'} onRetry={refetch} />;

  const statusPresentation = STATUS_PRESENTATION[ticket.status];

  return (
    <ScreenContainer scroll>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>
          TicketFlow <Text style={styles.brandAccent}>Kenya</Text>
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusPresentation.bg }]}>
          <Text style={[styles.statusText, { color: statusPresentation.color }]}>{statusPresentation.label}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Image source={resolvePosterSource(ticket.event.posterUrl)} style={styles.poster} contentFit="cover" transition={150} />

        <View style={styles.cardBody}>
          <Text style={styles.eventTitle}>{ticket.event.title}</Text>
          <View style={styles.metaRow}>
            <Feather name="calendar" size={13} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{formatEventDateTime(ticket.event.startsAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={13} color={Colors.textSecondary} />
            <Text style={styles.metaText}>
              {ticket.event.venue}, {ticket.event.city}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.qrWrap}>
            <View style={styles.qrBorder}>
              {/* The real backend returns an already-rendered QR as a data-URL PNG;
                  mock mode returns a raw token we encode on-device. Both are
                  server-issued — the app never invents a QR payload itself. */}
              {ticket.qrToken.startsWith('data:image') ? (
                <Image source={{ uri: ticket.qrToken }} style={styles.qrImage} contentFit="contain" />
              ) : (
                <QRCode value={ticket.qrToken} size={190} color={Colors.text} backgroundColor={Colors.white} />
              )}
            </View>
            <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <DetailItem label="Holder" value={ticket.holderName} />
            <DetailItem label="Tier" value={ticket.ticketType.name} />
          </View>
        </View>
      </View>

      <View style={styles.noticeCard}>
        <Feather name="shield" size={16} color={Colors.textSecondary} />
        <Text style={styles.noticeText}>
          This QR code is unique to this ticket and can only be scanned once for entry. Do not share it publicly.
        </Text>
      </View>

      {!!actionError && <Text style={styles.actionError}>{actionError}</Text>}

      <View style={styles.actionsRow}>
        <AppButton
          label="Download PDF"
          onPress={() => handleDownloadOrShare('Save your ticket')}
          variant="outline"
          loading={isProcessing}
          disabled={isProcessing}
          style={styles.actionButton}
        />
        <AppButton
          label="Share"
          onPress={() => handleDownloadOrShare('Share your ticket')}
          loading={isProcessing}
          disabled={isProcessing}
          style={styles.actionButton}
        />
      </View>
    </ScreenContainer>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  brand: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text },
  brandAccent: { color: Colors.primary },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  poster: { width: '100%', aspectRatio: 16 / 9, backgroundColor: Colors.border },
  cardBody: { padding: Spacing.lg },
  eventTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },
  qrWrap: { alignItems: 'center', gap: Spacing.sm },
  qrBorder: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  qrImage: { width: 190, height: 190 },
  ticketNumber: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, letterSpacing: 1 },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: 2 },
  noticeCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noticeText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  actionError: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.md },
  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  actionButton: { flex: 1 },
});
