export const BG_COLOR_KEY = 'tfk_bg_color';

export const WHITE = '#ffffff';
export const BLACK = '#000000';
export const CREAM = '#f8f7f4';
export const DEFAULT_BG_COLOR = CREAM;

export const BG_COLOR_OPTIONS = [
  { name: 'Warm ivory', value: CREAM },
  { name: 'Clean white', value: WHITE },
  { name: 'Deep charcoal', value: BLACK },
];

export function themeFor(color: string): 'light' | 'dark' {
  return color.toLowerCase() === BLACK ? 'dark' : 'light';
}
