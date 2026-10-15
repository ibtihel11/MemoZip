import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'accent' | 'mint' | 'warn';

const fills: Record<Tone, string> = { accent: 'bg-accent', mint: 'bg-mint', warn: 'bg-warn' };

interface Props {
  value: number;
  tone?: Tone;
  size?: 'sm' | 'md';
  label: string;
  className?: string;
}

export function ProgressBar({ value, tone = 'accent', size = 'md', label, className }: Props) {
  const [shown, setShown] = useState(0);
  const clamped = Math.max(0, Math.min(100, value));

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn('w-full overflow-hidden rounded-full bg-surface2', size === 'sm' ? 'h-1.5' : 'h-2.5', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', fills[tone])} style={{ width: `${shown}%` }} />
    </div>
  );
}
