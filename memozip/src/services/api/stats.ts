import type { Stats } from '@/types';
import { http } from './http';
import { mapStats } from './mappers';

export const stats = {
  async get(): Promise<Stats> {
    return mapStats(await http('/stats'));
  },
};
