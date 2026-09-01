import { create } from 'zustand';

interface AppState {
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
}

/**
 * Non-sensitive UI preferences only — nothing here should be treated as
 * confidential, and logout must never need to clear it.
 */
export const useAppStore = create<AppState>((set) => ({
  hasSeenOnboarding: false,
  setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
}));
