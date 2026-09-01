import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, MIN_TOUCH_TARGET, Radius, Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth.store';
import { useEvents, useFeaturedEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/EventCard';
import { FeaturedEventCard } from '@/components/FeaturedEventCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { EventItem } from '@/types/event';

const CATEGORIES = ['All', 'Music', 'Theatre', 'Festivals', 'Conferences', 'Sports', 'Nightlife'];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { events, isLoading, isRefreshing, error, refetch, refresh } = useEvents({
    search: search || undefined,
    category,
  });
  const { events: featuredEvents } = useFeaturedEvents();

  const firstName = user?.name?.split(' ')[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList<EventItem>
        data={isLoading ? [] : events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <EventCard event={item} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <View style={styles.brandRow}>
                  <Image
                    source={require('../../assets/images/logo-mark.png')}
                    style={styles.brandMark}
                    contentFit="contain"
                    accessibilityLabel="TicketFlow Kenya logo"
                  />
                  <Text style={styles.brand}>
                    TicketFlow <Text style={styles.brandAccent}>Kenya</Text>
                  </Text>
                </View>
                <Text style={styles.greeting}>{firstName ? `Hi ${firstName}, find your next event` : 'Discover events near you'}</Text>
              </View>
            </View>

            <View style={styles.searchBar}>
              <Feather name="search" size={18} color={Colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search events, venues, cities…"
                placeholderTextColor={Colors.textSecondary}
                style={styles.searchInput}
                autoCapitalize="none"
                returnKeyType="search"
                accessibilityLabel="Search events"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Feather name="x" size={16} color={Colors.textSecondary} />
                </Pressable>
              )}
            </View>

            <CategoryChips selected={category} onSelect={setCategory} />

            {featuredEvents.length > 0 && (
              <View style={styles.featuredSection}>
                <Text style={styles.sectionTitle}>Featured events</Text>
                <FlatList
                  horizontal
                  data={featuredEvents}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.featuredCardWrapper}>
                      <FeaturedEventCard event={item} />
                    </View>
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredListContent}
                />
              </View>
            )}

            <Text style={styles.sectionTitle}>Upcoming events</Text>

            {isLoading && (
              <View style={styles.skeletonList}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.skeletonCard} />
                ))}
              </View>
            )}

            {!isLoading && !!error && <ErrorState message={error.message} onRetry={refetch} />}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState
              icon="calendar"
              title="No events found"
              message={search ? `No events match "${search}".` : 'Check back soon for new events.'}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function CategoryChips({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
  return (
    <FlatList
      horizontal
      data={CATEGORIES}
      keyExtractor={(item) => item}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      renderItem={({ item }) => {
        const active = item === selected;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: Spacing.xxxl },
  headerRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  brandMark: { width: 26, height: 26 },
  brand: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  brandAccent: { color: Colors.primary },
  greeting: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.xs, maxWidth: '90%' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    height: MIN_TOUCH_TARGET,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.text, height: '100%' },
  chipRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.lg },
  chip: {
    paddingHorizontal: Spacing.lg,
    height: 36,
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: Colors.white },
  featuredSection: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  featuredListContent: { paddingHorizontal: Spacing.lg },
  featuredCardWrapper: { marginRight: Spacing.md },
  cardWrapper: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  skeletonList: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  skeletonCard: { height: 280, borderRadius: Radius.lg, backgroundColor: Colors.border },
  searchFieldSpacer: { height: 1 },
});
