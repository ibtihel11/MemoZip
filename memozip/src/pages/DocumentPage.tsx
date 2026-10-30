import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, FileText, MessageCircle, MoreHorizontal, StickyNote } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/States';
import { PageHeader, SectionTitle } from '@/components/PageHeader';
import { QuizCard } from '@/components/QuizCard';
import { ResourceCard } from '@/components/ResourceCard';
import { useResourceActions } from '@/components/ResourceActions';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dropdown } from '@/components/ui/Dropdown';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import { formatFileSize, plural } from '@/utils/format';

export default function DocumentPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const doc = useQuery(() => api.documents.get(id), [id]);
  const resource = useQuery(() => api.resources.get('document', id), [id]);
  const quizzes = useQuery(() => api.quizzes.list(), []);
  const all = useQuery(() => api.resources.list(), []);
  const { getMenu, dialogs } = useResourceActions({ onDeleted: () => navigate('/library', { replace: true }) });
  usePageTitle(doc.data?.title);

  if (doc.loading) return <LoadingState label="Opening your course…" />;
  if (doc.error || !doc.data) return <ErrorState message={doc.error?.message} onRetry={doc.refetch} />;
  const d = doc.data;

  const docQuizzes = (quizzes.data ?? []).filter((q) => q.documentId === d.id);
  const summaries = (all.data ?? []).filter((r) => r.type === 'summary' && r.documentId === d.id);

  return (
    <div>
      <PageHeader
        back={{ to: '/library', label: 'Library' }}
        title={d.title}
        subtitle={[plural(d.pages, 'page'), `${plural(d.conceptCount, 'concept')} identified`, d.sizeBytes > 0 ? formatFileSize(d.sizeBytes) : null].filter(Boolean).join(' · ')}
        actions={
          resource.data && (
            <Dropdown label="Document actions" items={getMenu(resource.data)} triggerClassName="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-muted transition hover:bg-surface2 hover:text-fg">
              <MoreHorizontal size={18} aria-hidden="true" />
            </Dropdown>
          )
        }
      />

      {(d.status === 'processing' || d.status === 'uploaded') && <ProcessingBanner onTick={doc.refetch} />}
      {d.status === 'failed' && <FailedBanner documentId={d.id} message={d.errorMessage} />}

      <Card className="p-6">
        <h2 className="text-lg font-semibold">What would you like to do?</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink to={`/documents/${d.id}/quiz/new`} size="lg" icon={<Brain size={18} aria-hidden="true" />}>Generate Quiz</ButtonLink>
          <ButtonLink to={`/documents/${d.id}/summary/new`} size="lg" variant="secondary" icon={<StickyNote size={18} aria-hidden="true" />}>Generate Summary</ButtonLink>
          <ButtonLink to={`/documents/${d.id}/ask`} size="lg" variant="ghost" icon={<MessageCircle size={18} aria-hidden="true" />}>Ask about this course</ButtonLink>
        </div>
        <h3 className="mt-7 text-sm font-medium text-muted">Topics in this course</h3>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {d.topics.map((t) => <Badge key={t.id}>{t.name}</Badge>)}
        </div>
      </Card>

      {docQuizzes.length > 0 && (
        <section className="mt-10" aria-label="Quizzes from this course">
          <SectionTitle>Quizzes</SectionTitle>
          <ul className="space-y-3">
            {docQuizzes.map((q) => (
              <li key={q.id}><DocQuizCard quizId={q.id} /></li>
            ))}
          </ul>
        </section>
      )}

      {summaries.length > 0 && (
        <section className="mt-10" aria-label="Summaries of this course">
          <SectionTitle>Summaries</SectionTitle>
          <ul className="space-y-3">
            {summaries.map((s) => <li key={s.id}><ResourceCard resource={s} menu={getMenu(s)} /></li>)}
          </ul>
        </section>
      )}

      {docQuizzes.length === 0 && summaries.length === 0 && (
        <p className="mt-10 flex items-center gap-2 text-muted">
          <FileText size={16} aria-hidden="true" /> Nothing created from this course yet. Start with a quiz or a summary.
        </p>
      )}
      {dialogs}
    </div>
  );
}

function DocQuizCard({ quizId }: { quizId: string }) {
  const quiz = useQuery(() => api.quizzes.get(quizId), [quizId]);
  const attempts = useQuery(() => api.quizzes.attempts(quizId), [quizId]);
  if (!quiz.data) return null;
  return <QuizCard quiz={quiz.data} latest={attempts.data?.[0]} />;
}

/** Shown while the backend is still analyzing the file; refreshes the page every few seconds. */
function ProcessingBanner({ onTick }: { onTick: () => void }) {
  useEffect(() => {
    const timer = window.setInterval(onTick, 3000);
    return () => window.clearInterval(timer);
  }, [onTick]);
  return (
    <Card role="status" className="mb-6 p-5">
      <p className="font-medium">We’re still analyzing this course.</p>
      <p className="mt-1 text-muted">Quizzes and summaries will be available as soon as it’s ready.</p>
    </Card>
  );
}

function FailedBanner({ documentId, message }: { documentId: string; message?: string | null }) {
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card role="alert" className="mb-6 border-warn/40 bg-warn/10 p-5">
      <p className="font-medium text-warn-text">We couldn’t analyze this course.</p>
      <p className="mt-1 text-muted">{error ?? message ?? 'Something went wrong while reading the file.'}</p>
      <Button
        className="mt-4"
        variant="secondary"
        loading={retrying}
        onClick={async () => {
          setRetrying(true);
          setError(null);
          try {
            await api.documents.retry(documentId);
          } catch (e) {
            setError(e instanceof Error ? e.message : null);
          } finally {
            setRetrying(false);
          }
        }}
      >
        Try again
      </Button>
    </Card>
  );
}
