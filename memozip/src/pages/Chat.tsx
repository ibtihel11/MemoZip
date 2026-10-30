import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, History, MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react';
import { Markdown } from '@/components/Markdown';
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

const titleFrom = (text: string) => (text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text);

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
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const suggestions = useQuery(() => api.chat.suggestions(scope), [scope]);

  // The conversation currently on screen. A ref, so async replies can tell if the user has moved on.
  const current = useRef<{ id: string | null }>({ id: null });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previousCount = useRef(0);

  // Scroll: a new answer is revealed from its first line (long answers are not thrown to the end),
  // everything else (your question, the typing indicator) goes to the bottom.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const last = messages[messages.length - 1];
    const jump = previousCount.current === 0 && messages.length > 1; // opening a saved chat
    previousCount.current = messages.length;
    const behavior: ScrollBehavior = jump ? 'auto' : 'smooth';
    const node = last?.role === 'assistant' && !thinking ? list.querySelector<HTMLElement>(`[data-msg="${last.id}"]`) : null;
    if (node && !jump) list.scrollTo({ top: Math.max(0, node.offsetTop - 16), behavior });
    else list.scrollTo({ top: list.scrollHeight, behavior });
  }, [messages, thinking]);

  // The message box grows with what you type, up to a limit.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  // React to the URL: /chat is a fresh chat, /chat/:id opens a saved one.
  useEffect(() => {
    if ((id ?? null) === current.current.id) return; // we created this one ourselves
    current.current.id = id ?? null;
    previousCount.current = 0;
    setError(null);
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

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;

    setMessages((m) => [...m, { id: uid('m'), role: 'user', text: question }]);
    setInput('');
    setError(null);
    setLoadError(false);
    setThinking(true);

    let convId = current.current.id;
    try {
      if (!convId) {
        // First message of a new chat: create the conversation on the backend, then move to its URL.
        const conversation = await api.chat.conversations.create(scope, titleFrom(question));
        convId = conversation.id;
        current.current.id = convId;
        navigate(`/chat/${convId}`, { replace: true });
      }
      const reply = await api.chat.sendMessage(convId, question);
      if (current.current.id === convId) setMessages((m) => [...m, reply]);
    } catch (e) {
      if (current.current.id === convId) setError(e instanceof Error ? e.message : 'We couldn’t get an answer. Please try again.');
    } finally {
      if (current.current.id === convId) setThinking(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  const readyDocs = (docs.data ?? []).filter((d) => !d.status || d.status === 'ready');
  const titleOf = (documentId?: string) => docs.data?.find((d) => d.id === documentId)?.title;
  const scopeName = scope === ALL_COURSES ? 'all your courses' : titleOf(scope) ?? 'your course';
  const conversations = history.data ?? [];
  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[26rem] gap-6 lg:h-[calc(100dvh-9rem)]">
      {/* Conversations (large screens) */}
      <aside aria-label="Conversations" className="hidden w-72 shrink-0 flex-col rounded-xl border border-border bg-surface lg:flex xl:w-80">
        <div className="flex items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="text-base font-semibold">Conversations</h2>
          <Button size="sm" variant="secondary" icon={<MessageSquarePlus size={16} aria-hidden="true" />} onClick={() => navigate('/chat')}>
            New
          </Button>
        </div>
        <nav aria-label="Previous chats" className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted">Your conversations will appear here.</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/chat/${c.id}`}
                    aria-current={c.id === id ? 'page' : undefined}
                    className={cn(
                      'block rounded-lg px-3 py-2.5 transition',
                      c.id === id ? 'bg-accent/15 text-fg' : 'text-muted hover:bg-surface2 hover:text-fg',
                    )}
                  >
                    <span className="block truncate text-[0.9375rem] font-medium">{c.title}</span>
                    <span className="block text-xs text-subtle">{formatRelative(c.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>

      {/* Conversation */}
      <section aria-label="Conversation" className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">AI Chat</h1>
            <p className="mt-1 text-muted">Answers from your own course material, with the pages they came from.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Answer from"
              className="w-full sm:w-64"
              value={scope}
              // The course is fixed when a chat starts; open a new chat to use another one.
              disabled={!empty || !!id}
              options={[{ value: ALL_COURSES, label: 'All my courses' }, ...readyDocs.map((d) => ({ value: d.id, label: d.title }))]}
              onChange={(e) => setScope(e.target.value)}
            />
            {conversations.length > 0 && (
              <div className="lg:hidden">
                <Dropdown
                  label="Previous chats"
                  triggerClassName="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:border-border-strong hover:text-fg"
                  items={conversations.slice(0, 8).map((c) => ({
                    label: `${c.title} · ${formatRelative(c.updatedAt)}`,
                    onSelect: () => navigate(`/chat/${c.id}`),
                  }))}
                >
                  <History size={16} aria-hidden="true" />
                  History
                </Dropdown>
              </div>
            )}
            {!empty && (
              <Button variant="secondary" className="lg:hidden" icon={<MessageSquarePlus size={16} aria-hidden="true" />} onClick={() => navigate('/chat')}>
                New chat
              </Button>
            )}
            {id && !empty && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm text-subtle transition hover:bg-surface2 hover:text-warn-text"
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </button>
            )}
          </div>
        </header>

        <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-surface/40 px-4 sm:px-8" aria-live="polite">
          <div className="mx-auto w-full max-w-3xl py-6">
            {empty && !loadError && (
              <div className="animate-fade-in py-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent-text">
                  <Sparkles size={22} aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">What would you like to understand?</h2>
                <p className="mt-2 max-w-xl leading-relaxed text-muted">
                  I’ll answer from {scopeName} and show you where each answer comes from. If your material doesn’t cover something, I’ll say so.
                </p>
                {(suggestions.data ?? []).length > 0 && (
                  <>
                    <p className="mt-8 text-sm font-medium text-muted">Start from a prompt, add your topic, then press Enter</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(suggestions.data ?? []).map((s) => (
                        <button
                          key={s.title}
                          type="button"
                          title={s.prompt}
                          onClick={() => {
                            setInput(s.prompt);
                            inputRef.current?.focus();
                          }}
                          className="rounded-full border border-border bg-surface px-4 py-2 text-left text-sm transition hover:border-accent/60 hover:bg-surface2"
                        >
                          {s.title}
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

            <ul className="space-y-7">
              {messages.map((m) => (
                <li key={m.id} data-msg={m.id} className={cn('animate-fade-in', m.role === 'user' && 'flex justify-end')}>
                  {m.role === 'user' ? (
                    <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-accent/15 px-4 py-3 leading-relaxed">{m.text}</p>
                  ) : (
                    <div className="flex gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface2 text-accent-text">
                        <Sparkles size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="sr-only">Answer</p>
                        <Markdown text={m.text} />
                        <div className="flex flex-wrap gap-2">
                          {(m.sources ?? []).slice(0, 3).map((s) => (
                            <SourceChip key={`${s.documentId}-${s.pages}-${s.section}`} source={s} titleOf={titleOf} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
              {thinking && (
                <li className="flex animate-fade-in items-center gap-3 text-muted" role="status">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-surface2 text-accent-text">
                    <Sparkles size={16} aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-1" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent-text" style={{ animationDelay: `${i * 140}ms` }} />
                    ))}
                  </span>
                  <span>Looking through {scopeName}…</span>
                </li>
              )}
              {error && (
                <li role="alert" className="text-sm text-warn-text">
                  {error}
                </li>
              )}
            </ul>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-4 w-full max-w-3xl shrink-0 rounded-2xl border border-border bg-surface p-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"
        >
          <label htmlFor="chat-input" className="sr-only">Your message</label>
          <div className="flex items-end gap-2">
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask about your courses…"
              className="max-h-44 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[1rem] placeholder:text-subtle focus:outline-none"
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
      </section>

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

function SourceChip({ source, titleOf }: { source: NonNullable<ChatMessage['source']>; titleOf: (documentId?: string) => string | undefined }) {
  const where = [source.documentTitle ?? titleOf(source.documentId), source.pages !== '—' ? `Pages ${source.pages}` : null, source.section]
    .filter(Boolean)
    .join(' · ');
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
