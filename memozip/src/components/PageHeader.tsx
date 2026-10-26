import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
      <ArrowLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions, back }: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <header className="mb-10">
      {back && <BackLink to={back.to}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.875rem] font-semibold leading-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-lg text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{children}</h2>
      {action}
    </div>
  );
}
