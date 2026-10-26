import type { ChatMessage, Conversation } from '@/types';
import { notify } from '../invalidate';
import { http } from './http';
import { listOf, mapConversation, pickAssistantReply } from './mappers';

/** Chat scope meaning "search every course". Any other scope is a document id. */
export const ALL_COURSES = 'all';

export const chat = {
  /** Starter questions for the empty chat. Never blocks the page if it fails. */
  async suggestions(scope: string): Promise<string[]> {
    try {
      const raw = await http<unknown>('/chat/suggestions', {
        // Both spellings are sent so it works whichever the backend declares (see /docs).
        query: { scope, document_id: scope === ALL_COURSES ? undefined : scope },
      });
      return listOf(raw, 'suggestions').filter((s): s is string => typeof s === 'string');
    } catch {
      return [];
    }
  },

  conversations: {
    async list(): Promise<Conversation[]> {
      return listOf(await http('/conversations'), 'conversations').map(mapConversation);
    },

    async get(id: string): Promise<Conversation> {
      return mapConversation(await http(`/conversations/${id}`));
    },

    /** Starts a chat. `scope` is ALL_COURSES or a document id. */
    async create(scope: string): Promise<Conversation> {
      const conversation = mapConversation(
        await http('/conversations', { method: 'POST', json: { documentId: scope === ALL_COURSES ? null : scope } }),
      );
      notify();
      return conversation;
    },

    async update(id: string, patch: { scope?: string; title?: string }): Promise<void> {
      await http(`/conversations/${id}`, {
        method: 'PATCH',
        json: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.scope !== undefined ? { documentId: patch.scope === ALL_COURSES ? null : patch.scope } : {}),
        },
      });
      notify();
    },

    async remove(id: string): Promise<void> {
      await http(`/conversations/${id}`, { method: 'DELETE' });
      notify();
    },
  },

  /** Asks a question in a conversation. Returns the assistant's answer with its source, if any. */
  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    const reply = pickAssistantReply(await http(`/conversations/${conversationId}/messages`, { method: 'POST', json: { content: text } }));
    notify();
    return reply;
  },
};
