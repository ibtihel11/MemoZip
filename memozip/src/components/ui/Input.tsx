import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const field =
  'w-full rounded-lg border border-border bg-surface px-3.5 text-[15px] text-fg placeholder:text-subtle transition ' +
  'hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(function Input(
  { label, hint, error, hideLabel, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={cn('mb-1.5 block text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(field, 'h-11', error && 'border-warn')}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-warn-text">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-subtle">{hint}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { label, hint, error, hideLabel, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const areaId = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={areaId} className={cn('mb-1.5 block text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      <textarea ref={ref} id={areaId} aria-invalid={error ? true : undefined} className={cn(field, 'py-3 leading-relaxed', error && 'border-warn')} {...rest} />
      {error ? <p className="mt-1.5 text-sm text-warn-text">{error}</p> : hint ? <p className="mt-1.5 text-sm text-subtle">{hint}</p> : null}
    </div>
  );
});
