import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, History, MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown } from '@/components/ui/Dropdown';
import { Select } from '@/components/ui/Select';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import { ALL_COURSES } from '@/services/api/chat';
import type { ChatMessage } from '@/types';
import { cn } from '@/utils/cn';
import { formatRelative } from '@/utils/format';
import { uid } from '@/utils/id';

const titleFrom = (text: string) => (text.length > 48 ? `${text.slice(0, 45).trimEnd()}…` : text);

export default function Chat() {
  usePageTitle('AI Chat');
  const { id } = useParams();
  const navigate = useNavigate();

  const docs = useQuery(() => api.documents.list(), []);
  const history = useQuery(() => api.chat.conversations.list(), []);

  const [scope, setScope] = useState(ALL_COURSES);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const suggestions = useQuery(() => api.chat.suggestions(scope), [scope]);

  // The conversation currently on screen. A ref, so async replies can tell if the user has moved on.
  const current = useRef<{ id: string | null }>({ id: null });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  // React to the URL: /chat is a fresh chat, /chat/:id opens a saved one.
  useEffect(() => {
    if ((id ?? null) === current.current.id) return; // we created this one ourselves
    current.current.id = id ?? null;
    setFailed(false);
    setLoadError(false);
    setThinking(false);
    setInput('');
    if (!id) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    api.chat.conversations
      .get(id)
      .then((c) => {
        if (cancelled) return;
        setMessages(c.messages);
        setScope(c.scope);
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([]);
          setLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const persist = useCallback((convId: string, nextScope: string, nextMessages: ChatMessage[]) => {
    const first = nextMessages.find((m) => m.role === 'user');
    return api.chat.conversations.save({
      id: convId,
      title: first ? titleFrom(first.text) : 'New chat',
      scope: nextScope,
      messages: nextMessages,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    const isNew = current.current.id === null;
    const convId = current.current.id ?? uid('chat');
    current.current.id = convId;

    const withQuestion: ChatMessage[] = [...messages, { id: uid('m'), role: 'user', text: question }];
    setMessages(withQuestion);
    setInput('');
    setFailed(false);
    setLoadError(false);
    setThinking(true);
    await persist(convId, scope, withQuestion);
    if (isNew) navigate(`/chat/${convId}`, { replace: true });

    try {
      const res = await api.chat.send(scope, question);
      const done: ChatMessage[] = [...withQuestion, { id: uid('m'), role: 'assistant', text: res.answer, source: res.source }];
      await persist(convId, scope, done);
      if (current.current.id === convId) setMessages(done);
    } catch {
      if (current.current.id === convId) setFailed(true);
    } finally {
      if (current.current.id === convId) setThinking(false);
    }
  };

  const changeScope = (next: string) => {
    setScope(next);
    if (current.current.id && messages.length > 0) void persist(current.current.id, next, messages);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const scopeName = scope === ALL_COURSES ? 'all your courses' : docs.data?.find((d) => d.id === scope)?.title ?? 'your course';
  const recent = (history.data ?? []).slice(0, 8);
  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-11rem)] max-w-3xl flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">AI Chat</h1>
          <p className="mt-1 text-muted">Ask questions and get answers from your own course material.</p>
        </div>
        <div className="flex items-center gap-2">
          {recent.length > 0 && (
            <Dropdown
              label="Previous chats"
              triggerClassName="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:border-border-strong hover:text-fg"
              items={recent.map((c) => ({
                label: `${c.title} · ${formatRelative(c.updatedAt)}`,
                onSelect: () => navigate(`/chat/${c.id}`),
              }))}
            >
              <History size={16} aria-hidden="true" />
              History
            </Dropdown>
          )}
          {!empty && (
            <Button variant="secondary" size="sm" icon={<MessageSquarePlus size={16} aria-hidden="true" />} onClick={() => navigate('/chat')}>
              New chat
            </Button>
          )}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select
          label="Answer from"
          className="w-full sm:w-72"
          value={scope}
          options={[{ value: ALL_COURSES, label: 'All my courses' }, ...(docs.data ?? []).map((d) => ({ value: d.id, label: d.title }))]}
          onChange={(e) => changeScope(e.target.value)}
        />
        {id && !empty && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-auto inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm text-subtle transition hover:bg-surface2 hover:text-warn-text"
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete chat
          </button>
        )}
      </div>

      <div className="flex-1 py-8" aria-live="polite">
        {empty && !loadError && (
          <div className="animate-fade-in">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent-text">
              <Sparkles size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">What would you like to understand?</h2>
            <p className="mt-2 max-w-xl leading-relaxed text-muted">
              I’ll answer from {scopeName} and show you where each answer comes from. If your material doesn’t cover something, I’ll say so.
            </p>
            {(suggestions.data ?? []).length > 0 && (
              <>
                <p className="mt-8 text-sm font-medium text-muted">Try asking</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(suggestions.data ?? []).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-border bg-surface px-4 py-2 text-left text-sm transition hover:border-accent/60 hover:bg-surface2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {loadError && (
          <p role="alert" className="text-warn-text">
            We couldn’t open that chat. It may have been deleted. <Link to="/chat" className="font-medium underline">Start a new one</Link>
          </p>
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
                    {m.source && <SourceChip source={m.source} />}
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
              <span className="animate-soft-pulse">Looking through {scopeName}…</span>
            </li>
          )}
          {failed && (
            <li role="alert" className="text-sm text-warn-text">
              We couldn’t get an answer. Check your connection and ask again.
            </li>
          )}
        </ul>
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="sticky bottom-20 rounded-2xl border border-border bg-surface p-2 shadow-card focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 lg:bottom-4">
        <label htmlFor="chat-input" className="sr-only">Your message</label>
        <div className="flex items-end gap-2">
          <textarea
            id="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about your courses…"
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[16px] placeholder:text-subtle focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-solid text-on-accent transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title="Delete this chat?"
        description="The conversation is removed from your history. Your courses are not affected."
        confirmLabel="Delete chat"
        onConfirm={async () => {
          if (id) await api.chat.conversations.remove(id);
          navigate('/chat');
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function SourceChip({ source }: { source: NonNullable<ChatMessage['source']> }) {
  const where = [source.documentTitle, source.pages !== '—' ? `Pages ${source.pages}` : null, source.section].filter(Boolean).join(' · ');
  const body = (
    <>
      <BookOpen size={15} className="shrink-0 text-accent-text" aria-hidden="true" />
      <span>
        <span className="font-medium text-fg">Based on your course</span> · {where}
      </span>
    </>
  );
  const cls = 'mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted';
  return source.documentId ? (
    <Link to={`/documents/${source.documentId}`} className={cn(cls, 'transition hover:border-accent/60 hover:text-fg')}>
      {body}
    </Link>
  ) : (
    <p className={cls}>{body}</p>
  );
}
