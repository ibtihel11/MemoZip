import { Brain } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Quiz, QuizAttempt } from '@/types';
import { formatRelative, plural } from '@/utils/format';

/** Compact saved-quiz summary with the two main actions. */
export function QuizCard({ quiz, latest }: { quiz: Quiz; latest?: QuizAttempt }) {
  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-text">
        <Brain size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{quiz.title}</h3>
        <p className="text-sm text-muted">
          {plural(quiz.questions.length, 'question')}
          {latest ? ` · Last attempt: ${latest.score}% ${formatRelative(latest.completedAt)}` : ' · Not attempted yet'}
        </p>
      </div>
      <div className="flex gap-2">
        {latest && <ButtonLink to={`/quizzes/${quiz.id}`} variant="secondary" size="sm">Results</ButtonLink>}
        <ButtonLink to={`/quizzes/${quiz.id}/take`} size="sm">{latest ? 'Retake' : 'Start'}</ButtonLink>
      </div>
    </Card>
  );
}
