import { useSearchParams } from 'react-router-dom';
import { Library as LibraryIcon, Search, SearchX } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { PageHeader } from '@/components/PageHeader';
import { ResourceCard } from '@/components/ResourceCard';
import { useResourceActions } from '@/components/ResourceActions';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import type { ResourceType } from '@/types';

type Filter = 'all' | ResourceType;
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'document', label: 'Documents' },
  { value: 'quiz', label: 'Quizzes' },
  { value: 'summary', label: 'Summaries' },
];

export default function Library() {
  usePageTitle('Library');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const rawType = params.get('type');
  const type: Filter = rawType === 'document' || rawType === 'quiz' || rawType === 'summary' ? rawType : 'all';

  const resources = useQuery(() => api.resources.list({ type: type === 'all' ? undefined : type, query: q }), [type, q]);
  const folders = useQuery(() => api.folders.list(), []);
  const { getMenu, dialogs } = useResourceActions();

  const update = (next: { q?: string; type?: Filter }) => {
    const p = new URLSearchParams(params);
    const nq = next.q ?? q;
    const nt = next.type ?? type;
    if (nq) p.set('q', nq); else p.delete('q');
    if (nt !== 'all') p.set('type', nt); else p.delete('type');
    setParams(p, { replace: true });
  };

  const folderName = (id: string | null) => folders.data?.find((f) => f.id === id)?.name;
  const filtering = q.trim() !== '' || type !== 'all';

  return (
    <div>
      <PageHeader title="Library" subtitle="Everything you've uploaded and saved, in one place." />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl label="Filter by type" hideLabel value={type} options={filters} onChange={(v) => update({ type: v })} />
        <div className="relative w-full sm:max-w-xs">
          <label htmlFor="library-search" className="sr-only">Search your library</label>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            id="library-search"
            type="search"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search by title or course"
            className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3.5 text-[0.9375rem] placeholder:text-subtle transition hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {resources.loading && <LoadingState label="Loading your library…" />}
      {resources.error && <ErrorState message={resources.error.message} onRetry={resources.refetch} />}

      {resources.data && resources.data.length === 0 && !filtering && (
        <EmptyState icon={LibraryIcon} title="Your library is empty" description="Upload a course to start creating quizzes and summaries.">
          <ButtonLink to="/upload">Upload a course</ButtonLink>
        </EmptyState>
      )}

      {resources.data && resources.data.length === 0 && filtering && (
        <EmptyState icon={SearchX} title="Nothing matches" description="Try a different word, or look in another category.">
          <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Clear search and filters</Button>
        </EmptyState>
      )}

      {resources.data && resources.data.length > 0 && (
        <>
          <p className="mb-3 text-sm text-subtle" aria-live="polite">
            {resources.data.length} {resources.data.length === 1 ? 'item' : 'items'}
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {resources.data.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <ResourceCard resource={r} menu={getMenu(r)} folderName={folderName(r.folderId)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {dialogs}
    </div>
  );
}
