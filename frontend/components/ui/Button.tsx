import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-glow hover:bg-brand-700 hover:shadow-elevated disabled:shadow-none',
  secondary: 'bg-navy-900 text-white shadow-soft hover:bg-navy-800 disabled:hover:bg-navy-900',
  outline: 'border border-line bg-white text-navy-900 shadow-soft hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-700',
  ghost: 'text-navy-700 hover:bg-navy-900/[0.055] hover:text-navy-900',
  danger: 'bg-danger-600 text-white shadow-soft hover:bg-danger-700 disabled:hover:bg-danger-600',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm gap-1.5',
  md: 'h-12 px-5 text-sm gap-2',
  lg: 'h-14 px-7 text-base gap-2.5',
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
    'inline-flex min-h-[44px] items-center justify-center rounded-btn font-bold tracking-[-0.01em]',
    'transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 active:translate-y-0',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
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
  ({ variant, size, fullWidth, loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" aria-hidden="true" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export default Button;
