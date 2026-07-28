import { HTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('rounded-2xl border border-line bg-white shadow-soft', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export default Card;
