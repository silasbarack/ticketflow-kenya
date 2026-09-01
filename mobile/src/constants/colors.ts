export const Colors = {
  primary: '#D71920',
  primaryDark: '#B91C1C',
  primaryLight: '#FEE2E2',
  text: '#111827',
  textSecondary: '#6B7280',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  success: '#15803D',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#B91C1C',
  errorLight: '#FEE2E2',
  border: '#E5E7EB',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(17, 24, 39, 0.6)',
  disabled: '#D1D5DB',
} as const;

export type ColorKey = keyof typeof Colors;
