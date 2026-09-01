import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppButton } from '@/components/AppButton';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth.store';
import { useEvents } from '@/hooks/useEvents';
import { ticketsService } from '@/services/tickets.service';
import { ValidateTicketResponse } from '@/types/ticket';
import { normalizeError } from '@/utils/errors';

const RESULT_PRESENTATION: Record<ValidateTicketResponse['result'], { color: string; bg: string; icon: keyof typeof Feather.glyphMap; heading: string }> = {
  VALID: { color: Colors.success, bg: Colors.successLight, icon: 'check-circle', heading: 'Entry approved' },
  ALREADY_USED: { color: Colors.warning, bg: Colors.warningLight, icon: 'alert-triangle', heading: 'Already used' },
  WRONG_EVENT: { color: Colors.error, bg: Colors.errorLight, icon: 'x-circle', heading: 'Wrong event' },
  REJECTED: { color: Colors.error, bg: Colors.errorLight, icon: 'slash', heading: 'Rejected' },
  INVALID: { color: Colors.error, bg: Colors.errorLight, icon: 'x-circle', heading: 'Invalid ticket' },
};

export default function ScannerScreen() {
  const user = useAuthStore((s) => s.user);

  if (!user || user.role === 'CUSTOMER') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon="lock"
          title="Access restricted"
          message="The ticket scanner is only available to organizer, scanner and admin accounts."
          action={<AppButton label="Go back" onPress={() => router.back()} variant="outline" fullWidth={false} />}
        />
      </SafeAreaView>
    );
  }

  return <ScannerContent />;
}

function ScannerContent() {
  const { events, isLoading: eventsLoading } = useEvents({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isLocked, setIsLocked] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidateTicketResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const handleScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (isLocked || !selectedEventId) return;
      setIsLocked(true);
      setScanError(null);
      setIsValidating(true);
      try {
        const response = await ticketsService.validate({ validationToken: data, eventId: selectedEventId });
        setResult(response);
      } catch (err) {
        setScanError(normalizeError(err).message);
      } finally {
        setIsValidating(false);
      }
    },
    [isLocked, selectedEventId],
  );

  function handleScanNext() {
    setResult(null);
    setScanError(null);
    setIsLocked(false);
  }

  if (!selectedEventId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.pickerHeader}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} style={styles.pickerBack}>
            <Feather name="chevron-left" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.pickerTitle}>Select an event to scan for</Text>
          <Text style={styles.pickerSubtitle}>Tickets will only be validated against this event.</Text>
        </View>
        {eventsLoading ? (
          <LoadingScreen />
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedEventId(item.id)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.eventOption, pressed && styles.pressed]}
              >
                <Text style={styles.eventOptionTitle}>{item.title}</Text>
                <Text style={styles.eventOptionMeta}>
                  {item.venue}, {item.city}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={<EmptyState icon="calendar" title="No events available" />}
          />
        )}
      </SafeAreaView>
    );
  }

  if (!permission) return <LoadingScreen />;

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon="camera"
          title="Camera access needed"
          message="TicketFlow Kenya needs camera access to scan ticket QR codes at the gate."
          action={<AppButton label="Grant camera access" onPress={requestPermission} fullWidth={false} />}
        />
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isLocked ? undefined : handleScanned}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'left', 'right']}>
        <View style={styles.overlayHeader}>
          <Pressable onPress={() => setSelectedEventId(null)} accessibilityRole="button" style={styles.overlayBack} hitSlop={8}>
            <Feather name="chevron-left" size={20} color={Colors.white} />
            <Text style={styles.overlayEventName} numberOfLines={1}>
              {selectedEvent?.title}
            </Text>
          </Pressable>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame} />
          {!result && !isValidating && <Text style={styles.frameHint}>Align the QR code within the frame</Text>}
        </View>
      </SafeAreaView>

      {isValidating && (
        <View style={styles.resultOverlay}>
          <LoadingScreen message="Validating ticket…" />
        </View>
      )}

      {!!scanError && !isValidating && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View style={[styles.resultIconCircle, { backgroundColor: Colors.errorLight }]}>
              <Feather name="wifi-off" size={32} color={Colors.error} />
            </View>
            <Text style={styles.resultHeading}>Couldn&apos;t reach the server</Text>
            <Text style={styles.resultMessage}>{scanError}</Text>
            <AppButton label="Scan again" onPress={handleScanNext} style={styles.resultButton} />
          </View>
        </View>
      )}

      {!!result && !isValidating && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            {(() => {
              const presentation = RESULT_PRESENTATION[result.result];
              return (
                <>
                  <View style={[styles.resultIconCircle, { backgroundColor: presentation.bg }]}>
                    <Feather name={presentation.icon} size={32} color={presentation.color} />
                  </View>
                  <Text style={styles.resultHeading}>{presentation.heading}</Text>
                  <Text style={styles.resultMessage}>{result.message}</Text>
                  {!!result.ticket && (
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketInfoRow}>{result.ticket.holderName}</Text>
                      <Text style={styles.ticketInfoRowSecondary}>
                        {result.ticket.ticketTypeName} · {result.ticket.ticketNumber}
                      </Text>
                      <Text style={styles.ticketInfoRowSecondary}>{new Date(result.ticket.validatedAt).toLocaleTimeString('en-KE')}</Text>
                    </View>
                  )}
                </>
              );
            })()}
            <AppButton label="Scan next ticket" onPress={handleScanNext} style={styles.resultButton} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  pickerHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  pickerBack: { marginBottom: Spacing.sm, alignSelf: 'flex-start' },
  pickerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  pickerSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  pickerList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
  eventOption: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pressed: { opacity: 0.85 },
  eventOptionTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  eventOptionMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  cameraContainer: { flex: 1, backgroundColor: Colors.black },
  overlay: { flex: 1, justifyContent: 'space-between' },
  overlayHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  overlayBack: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start', maxWidth: '90%' },
  overlayEventName: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  frame: { width: 240, height: 240, borderRadius: Radius.lg, borderWidth: 3, borderColor: Colors.white },
  frameHint: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  resultCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  resultIconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  resultHeading: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  resultMessage: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
  ticketInfo: { alignItems: 'center', marginTop: Spacing.md },
  ticketInfoRow: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  ticketInfoRowSecondary: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  resultButton: { marginTop: Spacing.xl },
});
