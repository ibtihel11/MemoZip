import { useId, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/** Single-choice control built on native radios, so keyboard and screen readers just work. */
export function SegmentedControl<T extends string>({ label, value, options, onChange, hideLabel, fullWidth, className }: Props<T>) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className={cn('mb-2 text-sm font-medium', hideLabel && 'sr-only')}>{label}</legend>
      <div className={cn('inline-flex rounded-lg border border-border bg-surface2/60 p-1', fullWidth && 'flex w-full')}>
        {options.map((o) => (
          <label key={o.value} className={cn('relative', fullWidth && 'flex-1')}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span
              className={cn(
                'flex h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-sm font-medium transition',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent',
                value === o.value ? 'bg-surface text-fg shadow-card ring-1 ring-border-strong' : 'text-muted hover:text-fg',
              )}
            >
              {o.icon}
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
