'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BG_COLOR_KEY, DEFAULT_BG_COLOR, themeFor } from '@/lib/appearance';

interface BackgroundColorContextType {
  color: string;
  defaultColor: string;
  setColor: (color: string) => void;
  reset: () => void;
}

const BackgroundColorContext = createContext<BackgroundColorContextType | null>(null);

function applyColor(color: string) {
  document.documentElement.style.setProperty('--bg-color', color);
  document.documentElement.dataset.theme = themeFor(color);
}

export function BackgroundColorProvider({ children }: { children: ReactNode }) {
  const [color, setColorState] = useState(DEFAULT_BG_COLOR);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BG_COLOR_KEY);
      if (stored) setColorState(stored);
    } catch {}
  }, []);

  const setColor = (next: string) => {
    setColorState(next);
    applyColor(next);
    try {
      localStorage.setItem(BG_COLOR_KEY, next);
    } catch {}
  };

  const reset = () => {
    setColorState(DEFAULT_BG_COLOR);
    applyColor(DEFAULT_BG_COLOR);
    try {
      localStorage.removeItem(BG_COLOR_KEY);
    } catch {}
  };

  return (
    <BackgroundColorContext.Provider value={{ color, defaultColor: DEFAULT_BG_COLOR, setColor, reset }}>
      {children}
    </BackgroundColorContext.Provider>
  );
}

export function useBackgroundColor() {
  const ctx = useContext(BackgroundColorContext);
  if (!ctx) throw new Error('useBackgroundColor must be used within BackgroundColorProvider');
  return ctx;
}
