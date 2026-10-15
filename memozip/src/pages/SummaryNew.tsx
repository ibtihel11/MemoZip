import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '@/components/States';
import { usePageTitle } from '@/hooks/usePageTitle';
import { api } from '@/services/api';

/** Generates a summary, then replaces itself with the summary page. */
export default function SummaryNew() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  usePageTitle('New summary');

  const run = () => {
    setError(null);
    api.summaries
      .generate(id)
      .then((s) => navigate(`/summaries/${s.id}`, { replace: true }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'We couldn’t generate the summary. Please try again.'));
  };

  useEffect(() => {
    if (started.current) return; // avoids a duplicate request in React StrictMode
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <ErrorState message={error} onRetry={run} />;
  return <LoadingState label="Writing your summary…" description="Finding the main concepts and the points worth remembering." className="min-h-[50vh]" />;
}
