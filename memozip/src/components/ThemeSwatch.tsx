import type { ThemeName } from '@/types';
import { cn } from '@/utils/cn';

/**
 * A solid dot in the theme's primary color. It sits inside an element carrying that theme's
 * data-theme attribute, so it reads the theme's own token (no duplicated hex).
 */
export function ThemeSwatch({ theme, className }: { theme: ThemeName; className?: string }) {
  return (
    <span
      data-theme={theme}
      aria-hidden="true"
      className={cn('inline-block h-5 w-5 shrink-0 rounded-full', className)}
      style={{ background: 'rgb(var(--primary))', boxShadow: 'inset 0 0 0 1px rgb(var(--text) / 0.28)' }}
    />
  );
}
