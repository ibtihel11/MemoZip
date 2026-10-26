import { useId } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { themes } from '@/theme/themes';
import { cn } from '@/utils/cn';
import { ThemeSwatch } from './ThemeSwatch';

/**
 * Compact switch built on native radios: arrow keys, screen readers
 * and focus styling work without extra code. The active theme is shown by the
 * raised pill; labels collapse to swatches below the xl breakpoint.
 */
export function ThemeSwitcher({ showLabels = true, className }: { showLabels?: boolean; className?: string }) {
  const { theme, setTheme } = useTheme();
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className="sr-only">Color theme</legend>
      <div className="inline-flex rounded-full border border-border bg-surface2/60 p-1">
        {themes.map((t) => {
          const active = t.name === theme;
          return (
            <label key={t.name} title={`${t.label}: ${t.tagline}`} className="relative">
              <input type="radio" name={name} value={t.name} checked={active} onChange={() => setTheme(t.name)} className="peer sr-only" />
              <span
                className={cn(
                  'flex h-10 cursor-pointer items-center gap-2 rounded-full px-2 text-[0.9375rem] lg:px-2.5 font-medium transition',
                  showLabels && 'xl:px-3',
                  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent',
                  active ? 'bg-surface text-fg ring-1 ring-border-strong' : 'text-muted hover:text-fg',
                )}
              >
                <ThemeSwatch theme={t.name} className={cn('transition-transform', active && 'scale-110')} />
                <span className={cn(showLabels ? 'sr-only xl:not-sr-only' : 'sr-only')}>{t.label}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
