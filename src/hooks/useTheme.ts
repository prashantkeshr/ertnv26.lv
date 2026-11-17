import { useCallback, useEffect, useState } from 'react';
import { prefs } from '@/services/storage/preferences';

export type ThemeChoice = 'system' | 'light' | 'dark';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

export const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'Automatic (follows your device)',
  light: 'Light',
  dark: 'Dark',
};

export function readTheme(): ThemeChoice {
  const saved = prefs.get('theme', 'system');
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/** "system" removes the attribute so the stylesheet follows prefers-color-scheme. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function nextTheme(choice: ThemeChoice): ThemeChoice {
  return ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]!;
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  useEffect(() => applyTheme(choice), [choice]);
  const set = useCallback((next: ThemeChoice) => {
    prefs.set('theme', next);
    setChoice(next);
  }, []);
  return { choice, set, cycle: () => set(nextTheme(choice)) };
}
