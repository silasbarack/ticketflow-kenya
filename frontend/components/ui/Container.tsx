import { HTMLAttributes } from 'react';
import clsx from 'clsx';

export default function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('container-page', className)} {...props} />;
}
