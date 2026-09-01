import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Ember gradient + halo. The halo is decoration only — state is always
  // carried by the label, never by the glow.
  primary:
    'bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-glow hover:from-brand-600 hover:to-brand-800 disabled:shadow-none',
  secondary: 'bg-ink-900 text-white hover:bg-ink-700 shadow-soft disabled:hover:bg-ink-900',
  outline: 'border border-line bg-white text-navy-900 hover:border-navy-300 hover:bg-navy-50/60',
  ghost: 'text-navy-700 hover:bg-navy-900/[0.06]',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 shadow-soft disabled:hover:bg-danger-600',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-[52px] px-7 text-base gap-2.5',
};

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return clsx(
    'inline-flex min-h-[44px] items-center justify-center rounded-full font-semibold tracking-[-0.01em]',
    'transition-all duration-200 active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && 'w-full',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, fullWidth, loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, fullWidth, className })}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export default Button;
