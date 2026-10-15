import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Multi-select chip; the check mark means state never relies on color alone. */
export function ChoiceChip({ label, checked, onChange }: Props) {
  return (
    <label className="relative">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        className={cn(
          'inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium transition',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'border-accent bg-accent/10 text-fg' : 'border-border bg-surface text-muted hover:border-border-strong hover:text-fg',
        )}
      >
        <span className={cn('grid h-4 w-4 place-items-center rounded border', checked ? 'border-accent bg-accent text-on-accent' : 'border-border-strong')}>
          {checked && <Check size={12} strokeWidth={3} aria-hidden="true" />}
        </span>
        {label}
      </span>
    </label>
  );
}
