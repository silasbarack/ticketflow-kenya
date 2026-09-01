import { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, Spacing } from '@/constants/spacing';
import { useNetworkRequest } from '@/hooks/useNetworkRequest';
import { ticketsService } from '@/services/tickets.service';
import { TicketCard } from '@/components/TicketCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Ticket } from '@/types/ticket';

interface TicketSection {
  title: string;
  data: Ticket[];
}

export default function TicketsScreen() {
  const { data, isLoading, isRefreshing, error, refetch, refresh } = useNetworkRequest(
    () => ticketsService.listMine(),
    [],
  );

  const sections = useMemo<TicketSection[]>(() => {
    const tickets = data ?? [];
    const upcoming = tickets.filter((t) => t.status === 'VALID');
    const used = tickets.filter((t) => t.status === 'USED');
    const inactive = tickets.filter((t) => t.status === 'CANCELLED' || t.status === 'REFUNDED' || t.status === 'VOID');

    const result: TicketSection[] = [];
    if (upcoming.length) result.push({ title: 'Upcoming', data: upcoming });
    if (used.length) result.push({ title: 'Used', data: used });
    if (inactive.length) result.push({ title: 'Cancelled / Refunded', data: inactive });
    return result;
  }, [data]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tickets</Text>
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <TicketCard ticket={item} />
            </View>
          )}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={isRefreshing}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="tag"
              title="No tickets yet"
              message="Tickets you purchase will show up here, ready to scan at the gate."
            />
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
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardWrapper: { marginBottom: Spacing.md },
  skeletonList: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  skeletonCard: { height: 140, borderRadius: 16, backgroundColor: Colors.border },
});
