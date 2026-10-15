import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-card',
        interactive && 'transition duration-150 hover:border-border-strong hover:bg-surface2/60',
        className,
      )}
      {...rest}
    />
  );
}
