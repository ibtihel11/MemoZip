import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Send, Sparkles } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/States';
import { BackLink } from '@/components/PageHeader';
import { Select } from '@/components/ui/Select';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import type { ChatMessage } from '@/types';
import { uid } from '@/utils/id';
import { cn } from '@/utils/cn';

export default function Ask() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const doc = useQuery(() => api.documents.get(id), [id]);
  const docs = useQuery(() => api.documents.list(), []);
  const suggestions = useQuery(() => api.chat.suggestions(id), [id]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [failed, setFailed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  usePageTitle('Ask about your course');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  if (doc.loading) return <LoadingState label="Opening your course…" />;
  if (doc.error || !doc.data) return <ErrorState message={doc.error?.message} onRetry={doc.refetch} />;

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    setMessages((m) => [...m, { id: uid('m'), role: 'user', text: question }]);
    setInput('');
    setFailed(false);
    setThinking(true);
    try {
      const res = await api.chat.ask(id, question);
      setMessages((m) => [...m, { id: uid('m'), role: 'assistant', text: res.answer, source: res.source }]);
    } catch {
      setFailed(true);
    } finally {
      setThinking(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void ask(input);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-2xl flex-col">
      <BackLink to={`/documents/${id}`}>Back to course</BackLink>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{doc.data.title}</h1>
          <p className="mt-1 text-muted">Ask anything about this course…</p>
        </div>
        {docs.data && docs.data.length > 1 && (
          <Select
            label="Course"
            hideLabel
            className="w-52"
            value={id}
            options={docs.data.map((d) => ({ value: d.id, label: d.title }))}
            onChange={(e) => navigate(`/documents/${e.target.value}/ask`)}
          />
        )}
      </header>

      <div className="flex-1 py-8" aria-live="polite">
        {messages.length === 0 && (
          <div className="animate-fade-in">
            <p className="text-sm font-medium text-muted">Try asking</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(suggestions.data ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-left text-sm transition hover:border-accent/60 hover:bg-surface2"
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-subtle">Answers come from your course material, with the pages they were found on. If your course doesn’t cover something, you’ll be told.</p>
          </div>
        )}

        <ul className="space-y-6">
          {messages.map((m) => (
            <li key={m.id} className={cn('animate-fade-in', m.role === 'user' && 'flex justify-end')}>
              {m.role === 'user' ? (
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent/15 px-4 py-3 leading-relaxed">{m.text}</p>
              ) : (
                <div className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface2 text-accent-text">
                    <Sparkles size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="sr-only">Answer</p>
                    <p className="text-[17px] leading-8">{m.text}</p>
                    {m.source && (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
                        <BookOpen size={15} className="text-accent-text" aria-hidden="true" />
                        <span>
                          <span className="font-medium text-fg">Based on your course</span> · Pages {m.source.pages}
                          {m.source.section ? ` · ${m.source.section}` : ''}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
          {thinking && (
            <li className="flex items-center gap-3 text-muted" role="status">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-surface2 text-accent-text">
                <Sparkles size={16} aria-hidden="true" />
              </span>
              <span className="animate-soft-pulse">Looking through your course…</span>
            </li>
          )}
          {failed && <li role="alert" className="text-sm text-warn-text">We couldn’t get an answer. Check your connection and ask again.</li>}
        </ul>
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="sticky bottom-20 rounded-2xl border border-border bg-surface p-2 shadow-card focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 lg:bottom-4">
        <label htmlFor="question" className="sr-only">Your question</label>
        <div className="flex items-end gap-2">
          <textarea
            id="question"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Why does TCP use slow start?"
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[16px] placeholder:text-subtle focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send question"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-solid text-on-accent transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
