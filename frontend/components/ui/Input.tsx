import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export const inputClasses =
  'h-12 w-full min-w-0 rounded-btn border border-line bg-white px-4 text-[15px] text-navy-900 placeholder:text-muted/70 shadow-soft transition-[border-color,box-shadow,background-color] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-navy-900/5';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={clsx(inputClasses, className)} {...props} />,
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

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={clsx(inputClasses, 'h-auto min-h-32 resize-y py-3.5 leading-relaxed', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={clsx('mb-2 block text-[13px] font-bold text-navy-800', className)} {...props} />;
}
