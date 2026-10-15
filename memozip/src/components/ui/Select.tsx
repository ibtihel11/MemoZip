import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hideLabel?: boolean;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ label, hideLabel, options, className, id, ...rest }, ref) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={selectId} className={cn('mb-1.5 block text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className="h-11 w-full appearance-none rounded-lg border border-border bg-surface pl-3.5 pr-10 text-[15px] text-fg transition hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle" />
      </div>
    </div>
  );
});
