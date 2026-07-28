import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={clsx(
        'inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-700 transition hover:bg-navy-900/5 focus-visible:bg-navy-900/5',
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';

export default IconButton;
