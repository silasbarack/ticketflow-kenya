import { useMemo } from 'react';
import { eventsService, EventListParams } from '@/services/events.service';
import { useNetworkRequest } from './useNetworkRequest';

export function useEvents(params: EventListParams = {}) {
  const { search, category } = params;
  const { data, isLoading, isRefreshing, error, refetch, refresh } = useNetworkRequest(
    () => eventsService.list({ search, category }),
    [search, category],
  );

  return {
    events: data?.events ?? [],
    total: data?.total ?? 0,
    isLoading,
    isRefreshing,
    error,
    refetch,
    refresh,
  };
}

export function useFeaturedEvents() {
  const { data, isLoading, error, refetch } = useNetworkRequest(() => eventsService.featured(), []);
  return { events: useMemo(() => data ?? [], [data]), isLoading, error, refetch };
}

export function useEvent(eventId: string) {
  const { data, isLoading, error, refetch } = useNetworkRequest(() => eventsService.getById(eventId), [eventId]);
  return { event: data, isLoading, error, refetch };
}
