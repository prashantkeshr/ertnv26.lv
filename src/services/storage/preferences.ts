/**
 * Small preferences in localStorage (locale, recent searches).
 * Larger user data — projects, drafts, checklists — belongs in IndexedDB (Phase 3).
 *
 * localStorage can be unavailable (private mode, blocked site data), so every access is
 * guarded and the app works without it.
 */
const PREFIX = 'eport:';

interface PrefShape {
  locale: string;
  theme: string;
  liveWeb: boolean;
  recentSearches: string[];
}

function read<K extends keyof PrefShape>(key: K, fallback: PrefShape[K]): PrefShape[K] {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : fallback) as PrefShape[K];
    }
    return (typeof parsed === typeof fallback ? parsed : fallback) as PrefShape[K];
  } catch {
    return fallback;
  }
}

function write<K extends keyof PrefShape>(key: K, value: PrefShape[K]): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const prefs = { get: read, set: write };

const MAX_RECENT = 6;

export const recentSearches = {
  list(): string[] {
    return read('recentSearches', []);
  },
  add(query: string): void {
    const q = query.trim();
    if (q.length < 2) return;
    const next = [q, ...this.list().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
    write('recentSearches', next);
  },
  clear(): void {
    write('recentSearches', []);
  },
};
