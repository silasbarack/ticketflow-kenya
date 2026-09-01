import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { useNetworkRequest } from '@/hooks/useNetworkRequest';
import { notificationsService } from '@/services/notifications.service';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Notification, NotificationType } from '@/types/notification';
import { formatRelativeTime } from '@/utils/date';

const TYPE_META: Record<NotificationType, { icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = {
  PAYMENT_SUCCESSFUL: { icon: 'check-circle', color: Colors.success, bg: Colors.successLight },
  PAYMENT_FAILED: { icon: 'x-circle', color: Colors.error, bg: Colors.errorLight },
  TICKET_ISSUED: { icon: 'tag', color: Colors.primary, bg: Colors.primaryLight },
  EVENT_REMINDER: { icon: 'clock', color: Colors.warning, bg: Colors.warningLight },
  EVENT_CHANGED: { icon: 'edit-3', color: Colors.warning, bg: Colors.warningLight },
  EVENT_CANCELLED: { icon: 'alert-triangle', color: Colors.error, bg: Colors.errorLight },
  REFUND_PROCESSED: { icon: 'rotate-ccw', color: Colors.textSecondary, bg: Colors.border },
};

export default function NotificationsScreen() {
  const { data, isLoading, isRefreshing, error, refetch, refresh } = useNetworkRequest(
    () => notificationsService.list(),
    [],
  );
  const [readOverrides, setReadOverrides] = useState<Record<string, true>>({});

  const notifications = useMemo(
    () => (data ?? []).map((n) => (readOverrides[n.id] ? { ...n, read: true } : n)),
    [data, readOverrides],
  );

  async function handlePress(notification: Notification) {
    if (!notification.read) {
      setReadOverrides((prev) => ({ ...prev, [notification.id]: true }));
      notificationsService.markRead(notification.id).catch(() => {});
    }
    if (notification.relatedTicketId) {
      router.push(`/ticket/${notification.relatedTicketId}`);
    } else if (notification.relatedEventId) {
      router.push(`/events/${notification.relatedEventId}`);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {isLoading && (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      )}

      {!isLoading && !!error && <ErrorState message={error.message} onRetry={refetch} />}

      {!isLoading && !error && (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={isRefreshing}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type];
            return (
              <Pressable
                onPress={() => handlePress(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                style={({ pressed }) => [styles.card, !item.read && styles.cardUnread, pressed && styles.pressed]}
              >
                <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                  <Feather name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.message} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState icon="bell" title="No notifications" message="We'll let you know when something needs your attention." />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  cardUnread: { borderColor: Colors.primary },
  pressed: { opacity: 0.9 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  message: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  time: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.xs },
  skeletonList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  skeletonCard: { height: 80, borderRadius: 16, backgroundColor: Colors.border },
});
