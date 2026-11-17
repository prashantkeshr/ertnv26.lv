/**
 * Unified search over a compact, prebuilt index (public/data/search/index.json).
 *
 * The index is loaded the first time someone uses search — not on page load — and holds
 * only titles, identifiers and keywords. Full records are loaded when a result is opened.
 * As datasets grow the index can be split by type without changing callers.
 */
import MiniSearch from 'minisearch';
import { loadDataset } from '@/services/data/loader';
import type { EntityType, SearchDoc } from '@/types/schemas';

export interface SearchResult extends SearchDoc {
  score: number;
  /** Index terms that matched, used for highlighting. */
  terms: string[];
}

export interface SearchOptions {
  types?: EntityType[];
  /** ISO alpha-2 of the country the user is currently looking at; nudges related records upward. */
  countryContext?: string | null;
  limit?: number;
}

export interface SearchEngine {
  search(query: string, options?: SearchOptions): SearchResult[];
  size: number;
}

const norm = (s: string) => s.trim().toLowerCase();

export function createSearchEngine(docs: SearchDoc[]): SearchEngine {
  // Records are read back from the original docs, not from MiniSearch stored fields:
  // extractField (below) flattens arrays to strings for indexing and would do the same to stored values.
  const byId = new Map(docs.map((d) => [d.id, d]));
  const mini = new MiniSearch<SearchDoc>({
    idField: 'id',
    fields: ['title', 'identifiers', 'subtitle', 'keywords'],
    extractField: (doc, field) => {
      const value = doc[field as keyof SearchDoc];
      return Array.isArray(value) ? value.join(' ') : (value as string);
    },
  });
  mini.addAll(docs);

  return {
    size: docs.length,
    search(query, options = {}) {
      const q = norm(query);
      if (!q) return [];
      const types = options.types?.length ? new Set(options.types) : null;
      const raw = mini.search(q, {
        prefix: true,
        // Typo tolerance for words long enough that one wrong letter is unambiguous.
        fuzzy: (term) => (term.length > 3 ? 0.2 : false),
        boost: { title: 3, identifiers: 4, subtitle: 1.2 },
        combineWith: 'AND',
        filter: types ? (r) => types.has(byId.get(r.id as string)?.type as EntityType) : undefined,
      });

      const ranked = raw.map((r) => {
        const doc = { ...byId.get(r.id as string)!, score: r.score, terms: r.terms };
        const title = norm(doc.title);
        let score = doc.score;
        // Exact identifier (ISO code, abbreviation) and exact title matches come first.
        if (doc.identifiers.some((id) => norm(id) === q)) score *= 8;
        if (title === q) score *= 6;
        else if (title.startsWith(q)) score *= 2.5;
        else if (title.split(/\s+/).some((w) => w.startsWith(q))) score *= 1.4;
        // Better-sourced records rank above weaker ones at equal relevance.
        score *= 0.5 + doc.quality / 2;
        if (options.countryContext && doc.country === options.countryContext) score *= 1.3;
        return { ...doc, score, terms: doc.terms };
      });
      ranked.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
      return options.limit ? ranked.slice(0, options.limit) : ranked;
    },
  };
}

let enginePromise: Promise<SearchEngine> | null = null;

export function loadSearchEngine(): Promise<SearchEngine> {
  enginePromise ??= loadDataset('search').then((file) => createSearchEngine(file.docs));
  enginePromise.catch(() => {
    enginePromise = null;
  });
  return enginePromise;
}

/**
 * Splits text into plain and highlighted parts. A word is highlighted when it starts with
 * a query word or equals a matched index term (which covers fuzzy matches).
 */
export function highlightParts(text: string, query: string, terms: string[] = []): Array<{ text: string; hit: boolean }> {
  const queryWords = norm(query).split(/\s+/).filter(Boolean);
  const termSet = new Set(terms.map(norm));
  if (!queryWords.length && !termSet.size) return [{ text, hit: false }];
  const parts: Array<{ text: string; hit: boolean }> = [];
  for (const token of text.split(/([\p{L}\p{N}]+)/u)) {
    if (!token) continue;
    const lower = token.toLowerCase();
    const isWord = /[\p{L}\p{N}]/u.test(token);
    const hit = isWord && (termSet.has(lower) || queryWords.some((w) => lower.startsWith(w)));
    const last = parts[parts.length - 1];
    if (last && last.hit === hit) last.text += token;
    else parts.push({ text: token, hit });
  }
  return parts;
}
