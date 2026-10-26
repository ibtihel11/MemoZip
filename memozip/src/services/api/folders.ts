import type { Folder } from '@/types';
import { notify } from '../invalidate';
import { http } from './http';
import { listOf, mapFolder } from './mappers';

export const folders = {
  async list(): Promise<Folder[]> {
    return listOf(await http('/folders'), 'folders').map(mapFolder);
  },

  async get(id: string): Promise<Folder> {
    return mapFolder(await http(`/folders/${id}`));
  },

  async create(name: string): Promise<Folder> {
    const folder = mapFolder(await http('/folders', { method: 'POST', json: { name } }));
    notify();
    return folder;
  },

  async rename(id: string, name: string): Promise<void> {
    await http(`/folders/${id}`, { method: 'PATCH', json: { name } });
    notify();
  },

  /** Deletes the folder only; its content stays in the library, unfiled. */
  async remove(id: string): Promise<void> {
    await http(`/folders/${id}`, { method: 'DELETE' });
    notify();
  },
};
