import type { ReactNode } from 'react';
import { AlertCircle, Loader2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

export function EmptyState({ icon: Icon, title, description, children, className }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto flex max-w-sm flex-col items-center px-4 py-14 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent-text">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1.5 leading-relaxed text-muted">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', description, className }: { label?: string; description?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col items-center justify-center px-4 py-16 text-center', className)}>
      <Loader2 size={26} className="animate-spin text-accent-text" aria-hidden="true" />
      <p className="mt-4 font-medium">{label}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('mx-auto flex max-w-sm flex-col items-center px-4 py-14 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-warn/15 text-warn-text">
        <AlertCircle size={26} aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-semibold">That didn't load</h2>
      <p className="mt-1.5 leading-relaxed text-muted">{message ?? 'Something went wrong on our side. Your saved study material is safe.'}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
