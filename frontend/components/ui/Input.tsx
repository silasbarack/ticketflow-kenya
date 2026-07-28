import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export const inputClasses =
  'h-12 w-full rounded-btn border border-line bg-white px-3.5 text-[15px] text-navy-900 placeholder:text-muted transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-navy-900/5';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={clsx(inputClasses, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={clsx(inputClasses, 'appearance-none bg-no-repeat pr-9', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={clsx('mb-1.5 block text-sm font-medium text-navy-800', className)} {...props} />;
}
