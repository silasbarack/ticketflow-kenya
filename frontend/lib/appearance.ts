export const BG_COLOR_KEY = 'tfk_bg_color';

export const WHITE = '#ffffff';
export const BLACK = '#000000';
export const DEFAULT_BG_COLOR = WHITE;

export const BG_COLOR_OPTIONS = [
  { name: 'White', value: WHITE },
  { name: 'Black', value: BLACK },
];

export function themeFor(color: string): 'light' | 'dark' {
  return color.toLowerCase() === BLACK ? 'dark' : 'light';
}
