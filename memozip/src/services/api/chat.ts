import type { ChatMessage, ChatSuggestion, Conversation } from '@/types';
import { notify } from '../invalidate';
import { http } from './http';
import { listOf, mapConversation, mapSuggestions, pickAssistantReply } from './mappers';

/** Chat scope meaning "search every course". Any other scope is a document id. */
export const ALL_COURSES = 'all';

export const chat = {
  /** Starter prompts for the empty chat. Never blocks the page if it fails. */
  async suggestions(scope: string): Promise<ChatSuggestion[]> {
    try {
      return mapSuggestions(await http<unknown>('/chat/suggestions', { query: { scope } }));
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

    /** Starts a chat. `scope` is ALL_COURSES or a document id. The scope cannot be changed later. */
    async create(scope: string, title = 'New chat'): Promise<Conversation> {
      const conversation = mapConversation(
        await http('/conversations', { method: 'POST', json: { title, documentId: scope === ALL_COURSES ? null : scope } }),
      );
      notify();
      return conversation;
    },

    async rename(id: string, title: string): Promise<void> {
      await http(`/conversations/${id}`, { method: 'PATCH', json: { title } });
      notify();
    },

    async remove(id: string): Promise<void> {
      await http(`/conversations/${id}`, { method: 'DELETE' });
      notify();
    },
  },

  /** Asks a question in a conversation. Returns the assistant's answer with its source, if any. */
  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    const reply = pickAssistantReply(await http(`/conversations/${conversationId}/messages`, { method: 'POST', json: { content: text }, timeoutMs: 90_000 }));
    notify();
    return reply;
  },
};
