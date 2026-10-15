import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'neutral' | 'accent' | 'mint' | 'warn';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface2 text-muted',
  accent: 'bg-accent/15 text-accent-text',
  mint: 'bg-mint/15 text-mint-text',
  warn: 'bg-warn/15 text-warn-text',
};

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
