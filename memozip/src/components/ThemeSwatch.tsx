import type { ThemeName } from '@/types';
import { cn } from '@/utils/cn';

/**
 * A small palette preview. It sits inside an element carrying that theme's
 * data-theme attribute, so it reads the theme's own tokens (no duplicated hex).
 */
export function ThemeSwatch({ theme, className }: { theme: ThemeName; className?: string }) {
  return (
    <span data-theme={theme} aria-hidden="true" className={cn('relative inline-grid h-5 w-5 shrink-0 place-items-center rounded-full', className)}
      style={{ background: 'conic-gradient(rgb(var(--primary)) 0 33.4%, rgb(var(--mastery)) 0 66.7%, rgb(var(--warning)) 0)' }}>
      <span className="h-2 w-2 rounded-full" style={{ background: 'rgb(var(--background))' }} />
    </span>
  );
}
