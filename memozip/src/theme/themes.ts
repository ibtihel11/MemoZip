import type { ThemeName } from '@/types';

export interface ThemeMeta {
  name: ThemeName;
  label: string;
  tagline: string;
  /** Matches --background, used for the browser UI color (meta theme-color). */
  browserColor: string;
}

export const DEFAULT_THEME: ThemeName = 'tokyo-night';
export const THEME_STORAGE_KEY = 'memozip-theme';

export const themes: ThemeMeta[] = [
  { name: 'tokyo-night', label: 'Tokyo Night', tagline: 'Amethyst · sleek and futuristic', browserColor: '#0F0C20' },
  { name: 'monokai', label: 'Monokai', tagline: 'Terminal code · technical and focused', browserColor: '#18181B' },
  { name: 'nord', label: 'Nord', tagline: 'Deep Arctic · calm and analytical', browserColor: '#1E293B' },
];

export const isThemeName = (v: unknown): v is ThemeName => themes.some((t) => t.name === v);
