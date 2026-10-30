import { Link, useNavigate, useParams } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/States';
import { PageHeader, SectionTitle } from '@/components/PageHeader';
import { ScoreChart } from '@/components/ScoreChart';
import { useResourceActions } from '@/components/ResourceActions';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dropdown } from '@/components/ui/Dropdown';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import type { Document, Resource } from '@/types';
import { formatRelative, formatShortDate, plural } from '@/utils/format';
import { masteryTone } from '@/utils/scoring';

export default function QuizDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const quiz = useQuery(() => api.quizzes.get(id), [id]);
  const attempts = useQuery(() => api.quizzes.attempts(id), [id]);
  const doc = useQuery<Document | null>(() => (quiz.data ? api.documents.get(quiz.data.documentId) : Promise.resolve(null)), [quiz.data?.documentId]);
  const resource = useQuery<Resource | null>(() => (quiz.data?.saved ? api.resources.get('quiz', id) : Promise.resolve(null)), [id, quiz.data?.saved]);
  const { getMenu, dialogs } = useResourceActions({ onDeleted: () => navigate('/library', { replace: true }) });
  usePageTitle(quiz.data?.title);

  if (quiz.loading || attempts.loading) return <LoadingState label="Opening your quiz…" />;
  if (quiz.error || !quiz.data) return <ErrorState message={quiz.error?.message} onRetry={quiz.refetch} />;

  const q = quiz.data;
  const list = attempts.data ?? []; // newest first
  const latest = list[0];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={{ to: '/library', label: 'Library' }}
        title={q.title}
        subtitle={
          <>
            {plural(q.questions.length, 'question')}
            {latest ? ` · Last attempt: ${latest.score}%` : ' · Not attempted yet'}
            {doc.data && <> · From <Link to={`/documents/${doc.data.id}`} className="text-accent-text hover:underline">{doc.data.title}</Link></>}
          </>
        }
        actions={
          resource.data && (
            <Dropdown label="Quiz actions" items={getMenu(resource.data)} triggerClassName="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-muted transition hover:bg-surface2 hover:text-fg">
              <MoreHorizontal size={18} aria-hidden="true" />
            </Dropdown>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <ButtonLink to={`/quizzes/${q.id}/take`} size="lg">{latest ? 'Retake Quiz' : 'Start Quiz'}</ButtonLink>
        {latest && <ButtonLink to={`/quizzes/${q.id}/results/${latest.id}`} size="lg" variant="secondary">View Results</ButtonLink>}
        {!q.saved && <Button size="lg" variant="secondary" onClick={() => void api.quizzes.save(q.id)}>Save quiz</Button>}
      </div>

      {list.length > 0 && (
        <section className="mt-12" aria-labelledby="history-title">
          <SectionTitle><span id="history-title">Attempt history</span></SectionTitle>

          {list.length > 1 && (
            <Card className="mb-4 p-4 sm:p-6">
              <ScoreChart attempts={list} />
            </Card>
          )}

          <Card>
            <ul className="divide-y divide-border">
              {list.map((a, i) => {
                const older = list[i + 1];
                const diff = older ? a.score - older.score : null;
                const tone = masteryTone(a.score);
                return (
                  <li key={a.id}>
                    <Link
                      to={`/quizzes/${q.id}/results/${a.id}`}
                      className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface2/60 focus-visible:outline-offset-[-2px]"
                    >
                      <span className="w-16 font-medium">{formatShortDate(a.completedAt)}</span>
                      <span className="text-lg font-semibold tabular-nums">{a.score}%</span>
                      <span className="hidden text-sm text-muted sm:inline">{a.correctCount} / {a.total} correct</span>
                      <span className="ml-auto flex items-center gap-3">
                        {diff !== null && diff !== 0 && (
                          <span className={diff > 0 ? 'text-sm font-medium text-mint-text' : 'text-sm font-medium text-warn-text'}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        )}
                        {i === 0 && <Badge tone="accent">Current</Badge>}
                        <span className="sr-only">
                          {tone === 'strong' ? 'Strong result' : tone === 'weak' ? 'Needs review' : ''} {formatRelative(a.completedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
          <p className="mt-3 text-sm text-subtle">Each retake adds a new attempt. The latest one is your current result, and earlier attempts stay here as history.</p>
        </section>
      )}
      {dialogs}
    </div>
  );
}
