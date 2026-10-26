import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, RotateCcw, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/States';
import { TopicPerformance } from '@/components/TopicPerformance';
import { SectionTitle } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import { buildAnalysis } from '@/utils/analysis';
import { formatShortDate } from '@/utils/format';
import { masteryTone, WEAK_THRESHOLD } from '@/utils/scoring';

export default function QuizResults() {
  const { id = '', attemptId = '' } = useParams();
  const navigate = useNavigate();
  const quiz = useQuery(() => api.quizzes.get(id), [id]);
  const attempt = useQuery(() => api.quizzes.attempt(attemptId), [attemptId]);
  const history = useQuery(() => api.quizzes.attempts(id), [id]);
  const [starting, setStarting] = useState(false);
  usePageTitle('Results');

  if (quiz.loading || attempt.loading) return <LoadingState label="Loading your results…" />;
  if (quiz.error || attempt.error || !quiz.data || !attempt.data) {
    return <ErrorState message={(quiz.error ?? attempt.error)?.message} onRetry={() => { quiz.refetch(); attempt.refetch(); }} />;
  }

  const a = attempt.data;
  const q = quiz.data;
  const ordered = [...(history.data ?? [])].sort((x, y) => +new Date(x.completedAt) - +new Date(y.completedAt));
  const position = ordered.findIndex((x) => x.id === a.id);
  const previous = position > 0 ? ordered[position - 1] : undefined;
  const isLatest = position === ordered.length - 1;
  const delta = previous ? a.score - previous.score : null;

  const weak = a.topicScores.filter((t) => t.score < WEAK_THRESHOLD).sort((x, y) => x.score - y.score);
  const wrong = a.answers.filter((r) => !r.correct);

  const reviewWeak = async () => {
    setStarting(true);
    try {
      const next = await api.quizzes.generate({
        documentId: q.documentId,
        count: 10,
        difficulty: 'mixed',
        types: ['multiple_choice', 'true_false', 'short_answer'],
        topicIds: weak.map((t) => t.topicId),
      });
      navigate(`/quizzes/${next.id}/take`);
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-4 text-sm text-muted">
        <Link to={`/quizzes/${q.id}`} className="hover:text-fg hover:underline">{q.title}</Link>
        {ordered.length > 1 && ` · Attempt ${position + 1} of ${ordered.length}, ${formatShortDate(a.completedAt)}`}
      </p>

      <Card className="p-6 text-center sm:p-10">
        <p className="inline-flex items-center gap-2 text-lg font-medium text-muted">
          <Check size={18} className="text-mint-text" aria-hidden="true" /> Quiz complete
        </p>
        <p className="mt-3 text-7xl font-semibold tabular-nums sm:text-8xl" aria-label={`Score: ${a.score} percent`}>{a.score}%</p>
        <p className="mt-2 text-lg text-muted">{a.correctCount} / {a.total} correct</p>
        {delta !== null && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
            {delta >= 0 ? <TrendingUp size={16} className="text-mint-text" aria-hidden="true" /> : <TrendingDown size={16} className="text-warn-text" aria-hidden="true" />}
            <span className={delta >= 0 ? 'text-mint-text' : 'text-warn-text'}>
              {delta === 0 ? 'Same as your previous attempt' : `${delta > 0 ? '+' : ''}${delta} points vs. your previous attempt`}
            </span>
          </p>
        )}
        <ProgressBar className="mx-auto mt-6 max-w-sm" value={a.score} tone={masteryTone(a.score) === 'weak' ? 'warn' : masteryTone(a.score) === 'strong' ? 'mint' : 'accent'} label="Overall score" />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to={`/quizzes/${q.id}/take`} icon={<RotateCcw size={16} aria-hidden="true" />}>Retake quiz</ButtonLink>
          {q.saved ? (
            <ButtonLink to={`/quizzes/${q.id}`} variant="secondary">Attempt history</ButtonLink>
          ) : (
            <Button variant="secondary" onClick={() => void api.quizzes.save(q.id)}>Save quiz</Button>
          )}
        </div>
        {!isLatest && <p className="mt-4 text-sm text-subtle">This is an earlier attempt. <Link to={`/quizzes/${q.id}`} className="font-medium text-accent-text hover:underline">See the latest result</Link></p>}
      </Card>

      <section className="mt-10" aria-labelledby="perf-title">
        <SectionTitle><span id="perf-title">Your performance</span></SectionTitle>
        <Card className="px-5 py-1 sm:px-6"><TopicPerformance topics={a.topicScores} /></Card>
      </section>

      <section className="mt-10" aria-labelledby="analysis-title">
        <Card className="border-accent/30 bg-accent/5 p-5 sm:p-6">
          <h2 id="analysis-title" className="flex items-center gap-2 text-base font-semibold">
            <Sparkles size={17} className="text-accent-text" aria-hidden="true" /> AI analysis
          </h2>
          <p className="mt-2 leading-relaxed">{a.analysis ?? buildAnalysis(a.topicScores)}</p>
        </Card>
      </section>

      {weak.length > 0 && (
        <section className="mt-10" aria-labelledby="review-title">
          <SectionTitle><span id="review-title">Review these topics</span></SectionTitle>
          <Card className="p-5 sm:p-6">
            <ul className="divide-y divide-border">
              {weak.map((t) => (
                <li key={t.topicId} className="flex items-center justify-between py-3 first:pt-0">
                  <span className="font-medium">{t.topicName}</span>
                  <Badge tone="warn">{t.score}% mastery</Badge>
                </li>
              ))}
            </ul>
            <Button className="mt-4" loading={starting} onClick={reviewWeak}>Review weak topics</Button>
          </Card>
        </section>
      )}

      <section className="mt-10" aria-labelledby="mistakes-title">
        <SectionTitle><span id="mistakes-title">{wrong.length ? `Questions to review (${wrong.length})` : 'Questions to review'}</span></SectionTitle>
        {wrong.length === 0 ? (
          <Card className="p-6 text-center text-muted">No mistakes this time. Every answer was correct.</Card>
        ) : (
          <ol className="space-y-4">
            {wrong.map((r) => {
              const question = q.questions.find((x) => x.id === r.questionId);
              if (!question) return null;
              const topic = a.topicScores.find((t) => t.topicId === question.topicId)?.topicName;
              return (
                <li key={r.questionId}>
                  <Card className="p-5 sm:p-6">
                    {topic && <Badge className="mb-3">{topic}</Badge>}
                    <h3 className="font-semibold leading-snug">{question.prompt}</h3>
                    <dl className="mt-4 space-y-3 text-[0.9375rem]">
                      <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3">
                        <dt className="text-sm font-medium text-warn-text">Your answer</dt>
                        <dd className="mt-0.5">{r.answer.trim() || 'No answer'}</dd>
                      </div>
                      <div className="rounded-lg border border-mint/40 bg-mint/10 px-4 py-3">
                        <dt className="text-sm font-medium text-mint-text">Correct answer</dt>
                        <dd className="mt-0.5">{r.correctAnswer || question.correctAnswer}</dd>
                      </div>
                    </dl>
                    <p className="mt-4 leading-relaxed text-muted"><span className="font-medium text-fg">Why: </span>{r.explanation || question.explanation}</p>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
