import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Check, Circle, FileText, Loader2, MessageCircle, StickyNote, X } from 'lucide-react';
import { ErrorState } from '@/components/States';
import { PageHeader } from '@/components/PageHeader';
import { UploadZone } from '@/components/UploadZone';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePageTitle } from '@/hooks/usePageTitle';
import { api } from '@/services/api';
import type { Document } from '@/types';
import { formatFileSize, plural } from '@/utils/format';
import { takePendingFile } from '@/utils/pendingFile';
import { validatePdf } from '@/utils/validation';
import { cn } from '@/utils/cn';

const STEPS = ['Reading document', 'Understanding structure', 'Identifying key concepts', 'Preparing study material'];

type Phase = 'idle' | 'selected' | 'processing' | 'ready' | 'failed';

export default function Upload() {
  usePageTitle('Upload');
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [doc, setDoc] = useState<Document | null>(null);

  const choose = (f: File) => {
    const problem = validatePdf(f);
    if (problem) {
      setError(problem);
      setFile(null);
      setPhase('idle');
      return;
    }
    setError(null);
    setFile(f);
    setPhase('selected');
  };

  useEffect(() => {
    const pending = takePendingFile();
    if (pending) choose(pending);
  }, []);

  const analyze = async () => {
    if (!file) return;
    setPhase('processing');
    setStep(0);
    try {
      setDoc(await api.documents.upload(file, setStep));
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : null);
      setPhase('failed');
    }
  };

  const reset = () => {
    setFile(null);
    setDoc(null);
    setError(null);
    setPhase('idle');
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={phase === 'ready' ? 'Your course is ready' : phase === 'processing' ? 'Analyzing your course…' : 'Upload your course'}
        subtitle={phase === 'idle' ? 'Add a PDF and MemoZip will turn it into study material.' : undefined}
      />

      {phase === 'idle' && <UploadZone onFile={choose} error={error} />}

      {phase === 'selected' && file && (
        <Card className="animate-fade-in p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-text">
              <FileText size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{file.name}</p>
              <p className="text-sm text-muted">{formatFileSize(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} aria-label={`Remove ${file.name}`} icon={<X size={16} aria-hidden="true" />}>
              Remove
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={analyze}>Analyze course</Button>
            <Button size="lg" variant="secondary" onClick={reset}>Choose another file</Button>
          </div>
        </Card>
      )}

      {phase === 'processing' && (
        <Card className="animate-fade-in p-6">
          <p className="text-muted">This usually takes under a minute. You can keep this tab open.</p>
          <ol aria-live="polite" className="mt-6 space-y-4">
            {STEPS.map((label, i) => {
              const state = i < step ? 'done' : i === step ? 'active' : 'todo';
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-7 w-7 place-items-center rounded-full',
                      state === 'done' && 'bg-mint/20 text-mint-text',
                      state === 'active' && 'bg-accent/15 text-accent-text',
                      state === 'todo' && 'text-subtle',
                    )}
                  >
                    {state === 'done' && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                    {state === 'active' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                    {state === 'todo' && <Circle size={14} aria-hidden="true" />}
                  </span>
                  <span className={cn(state === 'todo' ? 'text-subtle' : 'font-medium', state === 'active' && 'animate-soft-pulse')}>
                    {label}
                    <span className="sr-only">{state === 'done' ? ' (done)' : state === 'active' ? ' (in progress)' : ' (waiting)'}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <ProgressBar className="mt-7" value={(step / STEPS.length) * 100 + 8} label="Document analysis progress" />
        </Card>
      )}

      {phase === 'ready' && doc && (
        <Card className="animate-fade-in p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-mint/15 text-mint-text">
              <Check size={24} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold">{doc.title}</h2>
              <p className="mt-1 text-muted">{plural(doc.pages, 'page')} · {plural(doc.conceptCount, 'concept')} identified</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {doc.topics.map((t) => <Badge key={t.id}>{t.name}</Badge>)}
          </div>
          <h3 className="mt-8 text-lg font-semibold">What would you like to create?</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink to={`/documents/${doc.id}/quiz/new`} size="lg" icon={<Brain size={18} aria-hidden="true" />}>Generate Quiz</ButtonLink>
            <ButtonLink to={`/documents/${doc.id}/summary/new`} size="lg" variant="secondary" icon={<StickyNote size={18} aria-hidden="true" />}>Generate Summary</ButtonLink>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-sm">
            <Link to={`/documents/${doc.id}/ask`} className="inline-flex items-center gap-1.5 font-medium text-accent-text hover:underline">
              <MessageCircle size={15} aria-hidden="true" /> Ask about this course
            </Link>
            <button type="button" onClick={reset} className="font-medium text-muted hover:text-fg">Upload another file</button>
          </div>
        </Card>
      )}

      {phase === 'failed' && (
        <Card>
          <ErrorState message={error ?? 'We couldn’t finish analyzing this document. Your other resources are untouched. Try uploading it again.'} onRetry={() => { setError(null); setPhase('selected'); }} />
        </Card>
      )}
    </div>
  );
}
