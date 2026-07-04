'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface FavoritesContextType {
  favoriteIds: string[];
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (eventId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

const FAVORITES_KEY = 'tfk_favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) setFavoriteIds(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, hydrated]);

  const isFavorite = (eventId: string) => favoriteIds.includes(eventId);

  const toggleFavorite = (eventId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
    );
  };

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
