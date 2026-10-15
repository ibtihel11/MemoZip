import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, MessageCircle, MoreHorizontal, Pencil, RefreshCw, Save } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/States';
import { useResourceActions } from '@/components/ResourceActions';
import { BackLink } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { NameDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown } from '@/components/ui/Dropdown';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import type { Resource } from '@/types';
import { cn } from '@/utils/cn';

export default function SummaryPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const summary = useQuery(() => api.summaries.get(id), [id]);
  const doc = useQuery(() => (summary.data ? api.documents.get(summary.data.documentId) : Promise.resolve(null)), [summary.data?.documentId]);
  const resource = useQuery<Resource | null>(() => (summary.data?.saved ? api.resources.get('summary', id) : Promise.resolve(null)), [id, summary.data?.saved]);
  const { getMenu, dialogs } = useResourceActions({ onDeleted: () => navigate('/library', { replace: true }) });
  const [regenerating, setRegenerating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  usePageTitle(summary.data?.title);

  if (summary.loading) return <LoadingState label="Opening your summary…" />;
  if (summary.error || !summary.data) return <ErrorState message={summary.error?.message} onRetry={summary.refetch} />;
  const s = summary.data;

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await api.summaries.regenerate(id);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to={doc.data ? `/documents/${doc.data.id}` : '/library'}>{doc.data?.title ?? 'Library'}</BackLink>

      <div className="flex flex-wrap items-center gap-2">
        {s.saved ? (
          <Badge tone="mint" icon={<Check size={12} aria-hidden="true" />}>Saved</Badge>
        ) : (
          <Button size="sm" icon={<Save size={15} aria-hidden="true" />} onClick={() => void api.summaries.save(id)}>Save summary</Button>
        )}
        <Button size="sm" variant="secondary" icon={<Pencil size={15} aria-hidden="true" />} onClick={() => setRenaming(true)}>Rename</Button>
        {doc.data && (
          <ButtonLink to={`/documents/${doc.data.id}/ask`} size="sm" variant="secondary" icon={<MessageCircle size={15} aria-hidden="true" />}>Ask a question</ButtonLink>
        )}
        <Button size="sm" variant="secondary" loading={regenerating} icon={<RefreshCw size={15} aria-hidden="true" />} onClick={regenerate}>Regenerate</Button>
        {resource.data && (
          <Dropdown label="Summary actions" items={getMenu(resource.data)} triggerClassName="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted transition hover:bg-surface2 hover:text-fg">
            <MoreHorizontal size={16} aria-hidden="true" />
          </Dropdown>
        )}
      </div>

      <article className={cn('mt-8 transition-opacity duration-300', regenerating && 'opacity-40')} aria-busy={regenerating}>
        <header>
          <p className="text-sm font-medium text-accent-text">Summary</p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight sm:text-4xl">{s.title}</h1>
        </header>

        <section className="mt-10" aria-labelledby="overview">
          <h2 id="overview" className="border-b border-border pb-2 text-xl font-semibold">Overview</h2>
          <p className="mt-4 text-[17px] leading-8 text-muted">{s.overview}</p>
        </section>

        <section className="mt-10" aria-labelledby="concepts">
          <h2 id="concepts" className="border-b border-border pb-2 text-xl font-semibold">Key concepts</h2>
          <ol className="mt-5 space-y-6">
            {s.concepts.map((c, i) => (
              <li key={c.title} className="grid grid-cols-[2.5rem_1fr] gap-x-2">
                <span className="pt-0.5 text-sm font-semibold tabular-nums text-accent-text">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="mt-1 text-[17px] leading-8 text-muted">{c.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10" aria-labelledby="points">
          <h2 id="points" className="border-b border-border pb-2 text-xl font-semibold">Key points</h2>
          <ul className="mt-5 space-y-3">
            {s.keyPoints.map((p) => (
              <li key={p} className="flex gap-3 text-[17px] leading-8">
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </section>
      </article>

      <p className="mt-12 border-t border-border pt-5 text-sm text-subtle">
        Want to check what stuck? <Link to={doc.data ? `/documents/${doc.data.id}/quiz/new` : '/library'} className="font-medium text-accent-text hover:underline">Generate a quiz</Link>
      </p>

      <NameDialog
        open={renaming}
        title="Rename summary"
        label="Name"
        initialValue={s.title}
        onSubmit={(v) => api.summaries.rename(id, v)}
        onClose={() => setRenaming(false)}
      />
      {dialogs}
    </div>
  );
}
