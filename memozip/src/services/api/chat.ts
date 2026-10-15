import { db, notify } from '@/data/db';
import { suggestedQuestions } from '@/data/mockData';
import type { Conversation, SourceRef } from '@/types';
import { delay, NotFoundError } from './http';
import { answerAcrossCourses, answerQuestion } from './mockGenerators';

export const ALL_COURSES = 'all';

const byRecent = (a: Conversation, b: Conversation) => +new Date(b.updatedAt) - +new Date(a.updatedAt);

export const chat = {
  /** Course Q&A (RAG). The backend should retrieve relevant passages, answer from them and return the source. */
  async ask(documentId: string, question: string): Promise<{ answer: string; source: SourceRef }> {
    await delay(1500);
    const doc = db.documents.find((d) => d.id === documentId);
    if (!doc) throw new NotFoundError('document');
    return answerQuestion(doc, question);
  },

  /** AI Chat: `scope` is ALL_COURSES or a document id. `source` is omitted when nothing relevant was found. */
  async send(scope: string, question: string): Promise<{ answer: string; source?: SourceRef }> {
    await delay(1500);
    if (scope === ALL_COURSES) return answerAcrossCourses(db.documents, question);
    return chat.ask(scope, question);
  },

  async suggestions(scope: string): Promise<string[]> {
    await delay(100);
    if (scope === ALL_COURSES) {
      return db.documents.map((d) => suggestedQuestions[d.id]?.[0]).filter((s): s is string => !!s).slice(0, 4);
    }
    return suggestedQuestions[scope] ?? ['What are the main ideas of this course?', 'Explain the first topic in simple terms'];
  },

  conversations: {
    async list(): Promise<Conversation[]> {
      await delay(80);
      return [...db.conversations].sort(byRecent);
    },

    async get(id: string): Promise<Conversation> {
      await delay(80);
      const c = db.conversations.find((x) => x.id === id);
      if (!c) throw new NotFoundError('conversation');
      return c;
    },

    /** Creates or updates a conversation. */
    async save(conversation: Conversation): Promise<void> {
      const exists = db.conversations.some((c) => c.id === conversation.id);
      db.conversations = exists
        ? db.conversations.map((c) => (c.id === conversation.id ? conversation : c))
        : [conversation, ...db.conversations];
      notify();
    },

    async remove(id: string): Promise<void> {
      await delay(80);
      db.conversations = db.conversations.filter((c) => c.id !== id);
      notify();
    },
  },
};
