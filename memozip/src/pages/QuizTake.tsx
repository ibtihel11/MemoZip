import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/States';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Textarea } from '@/components/ui/Input';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import type { Document } from '@/types';
import { cn } from '@/utils/cn';
import { plural } from '@/utils/format';

const TYPE_LABEL = { multiple_choice: 'Multiple choice', true_false: 'True or false', short_answer: 'Short answer' } as const;

/** Focused quiz session: no sidebar, no stats, just the question. */
export default function QuizTake() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const quiz = useQuery(() => api.quizzes.get(id), [id]);
  const doc = useQuery<Document | null>(() => (quiz.data ? api.documents.get(quiz.data.documentId) : Promise.resolve(null)), [quiz.data?.documentId]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  usePageTitle('Quiz');

  const total = quiz.data?.questions.length ?? 0;
  const go = useCallback((n: number) => setIndex(Math.max(0, Math.min(total - 1, n))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return; // radios use arrow keys natively
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  if (quiz.loading) return <LoadingState label="Preparing your quiz…" className="min-h-screen" />;
  if (quiz.error || !quiz.data) return <ErrorState message={quiz.error?.message} onRetry={quiz.refetch} className="min-h-screen" />;

  const q = quiz.data.questions[index];
  const answered = quiz.data.questions.filter((x) => answers[x.id]?.trim()).length;
  const unanswered = total - answered;
  const last = index === total - 1;

  const setAnswer = (value: string) => setAnswers((a) => ({ ...a, [q.id]: value }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const attempt = await api.quizzes.submit(id, answers);
      navigate(`/quizzes/${id}/results/${attempt.id}`, { replace: true });
    } catch {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  };

  if (submitting) return <LoadingState label="Checking your answers…" description="Working out what you know and what to review." className="min-h-screen" />;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-6 pt-4 sm:px-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (answered > 0 ? setConfirmExit(true) : navigate(`/documents/${quiz.data!.documentId}`))}
          aria-label="Exit quiz"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface2 hover:text-fg"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{doc.data?.title ?? quiz.data.title}</p>
          <p className="text-sm text-muted" aria-live="polite">Question {index + 1} of {total}</p>
        </div>
        <ThemeSwitcher showLabels={false} />
      </header>

      <nav aria-label="Quiz progress" className="mt-4">
        <ol className="flex gap-1">
          {quiz.data.questions.map((x, i) => {
            const done = !!answers[x.id]?.trim();
            return (
              <li key={x.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to question ${i + 1}${done ? ', answered' : ''}`}
                  aria-current={i === index ? 'step' : undefined}
                  className="group flex h-4 w-full items-center"
                >
                  <span className={cn('h-1.5 w-full rounded-full transition-colors', i === index ? 'bg-accent' : done ? 'bg-accent/45' : 'bg-border group-hover:bg-border-strong')} />
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="flex flex-1 flex-col justify-center py-8">
        <div key={q.id} className="animate-question-in">
          <p className="mb-3 text-sm font-medium text-accent-text">{TYPE_LABEL[q.type]}</p>
          <h1 className="text-2xl font-semibold leading-snug sm:text-[1.75rem]">{q.prompt}</h1>

          <div className="mt-8">
            {q.type === 'short_answer' ? (
              <Textarea
                label="Your answer"
                hideLabel
                rows={5}
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your answer in your own words"
              />
            ) : (
              <div role="radiogroup" aria-label="Answer choices" className="space-y-3">
                {q.options?.map((opt, i) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <label key={opt} className="relative block">
                      <input type="radio" name={q.id} value={opt} checked={selected} onChange={() => setAnswer(opt)} className="peer sr-only" />
                      <span
                        className={cn(
                          'flex cursor-pointer items-center gap-4 rounded-xl border px-4 py-4 text-[1.0625rem] transition duration-150',
                          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                          selected ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-border-strong hover:bg-surface2/60',
                        )}
                      >
                        <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-semibold', selected ? 'border-accent bg-accent text-on-accent' : 'border-border-strong text-subtle')}>
                          {selected ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 -mx-4 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-surface">
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="lg" disabled={index === 0} onClick={() => go(index - 1)} icon={<ArrowLeft size={18} aria-hidden="true" />}>
            Previous
          </Button>
          <span className="hidden text-sm text-muted sm:block">{answered} of {total} answered</span>
          {last ? (
            <Button size="lg" onClick={() => (unanswered > 0 ? setConfirmSubmit(true) : void submit())}>Submit quiz</Button>
          ) : (
            <Button size="lg" onClick={() => go(index + 1)}>
              Next <ArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
      </footer>

      <ConfirmDialog
        open={confirmSubmit}
        title="Submit with unanswered questions?"
        description={`You have ${plural(unanswered, 'unanswered question')}. Unanswered questions count as incorrect.`}
        confirmLabel="Submit quiz"
        cancelLabel="Keep answering"
        onConfirm={submit}
        onClose={() => setConfirmSubmit(false)}
      />
      <ConfirmDialog
        open={confirmExit}
        destructive
        title="Leave this quiz?"
        description="Your answers for this attempt won’t be saved."
        confirmLabel="Leave quiz"
        cancelLabel="Keep going"
        onConfirm={() => navigate(`/documents/${quiz.data!.documentId}`)}
        onClose={() => setConfirmExit(false)}
      />
    </div>
  );
}
