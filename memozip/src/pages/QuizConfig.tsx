import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '@/components/States';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useUser } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import type { Difficulty, QuestionType } from '@/types';

const COUNTS = ['10', '15', '20', '30'].map((v) => ({ value: v, label: v }));
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];
const TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short answer' },
];

export default function QuizConfig() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useUser();
  const doc = useQuery(() => api.documents.get(id), [id]);
  const [count, setCount] = useState(String(user.defaultQuestionCount));
  const [difficulty, setDifficulty] = useState<Difficulty>(user.defaultDifficulty);
  const [types, setTypes] = useState<QuestionType[]>(['multiple_choice', 'true_false']);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  usePageTitle('New quiz');

  if (doc.loading) return <LoadingState label="Opening your course…" />;
  if (doc.error || !doc.data) return <ErrorState message={doc.error?.message} onRetry={doc.refetch} />;

  const toggle = (t: QuestionType, on: boolean) => setTypes((prev) => (on ? [...prev, t] : prev.filter((x) => x !== t)));

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const quiz = await api.quizzes.generate({ documentId: id, count: Number(count), difficulty, types });
      navigate(`/quizzes/${quiz.id}/take`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t generate the quiz. Please try again.');
      setGenerating(false);
    }
  };

  if (generating) {
    return <LoadingState label="Writing your questions…" description={`Every question is based on ${doc.data.title}, with an explanation for each answer.`} className="min-h-[50vh]" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ to: `/documents/${id}`, label: doc.data.title }} title="Generate a quiz" subtitle={`From ${doc.data.title}`} />
      <Card className="space-y-8 p-6">
        <SegmentedControl label="Number of questions" value={count} options={COUNTS} onChange={setCount} />
        <SegmentedControl label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={setDifficulty} />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Question types</legend>
          <div className="flex flex-wrap gap-2.5">
            {TYPES.map((t) => (
              <ChoiceChip key={t.value} label={t.label} checked={types.includes(t.value)} onChange={(on) => toggle(t.value, on)} />
            ))}
          </div>
          {types.length === 0 && <p role="alert" className="mt-2 text-sm text-warn-text">Choose at least one question type.</p>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-warn-text">{error}</p>}
        <Button size="lg" className="w-full sm:w-auto" disabled={types.length === 0} onClick={generate}>Generate Quiz</Button>
      </Card>
    </div>
  );
}
