/**
 * Wikipedia search (MediaWiki Action API) — live encyclopedia results for the search page.
 * Registry id: "wikipedia". No key; browser access verified 2026-11-17 (origin=* CORS).
 *
 * Context only: results are general-interest and unverified, and are labelled as such.
 * Text is CC BY-SA 4.0 — each result links to its article for attribution.
 */
import { z } from 'zod';
import { cached, type Cached } from '../cache';
import { fetchJson } from '../http';

export const WIKIPEDIA_ID = 'wikipedia';
const TTL = 30 * 60_000;

const Response = z.object({
  query: z
    .object({
      pages: z.array(z.object({ pageid: z.number(), title: z.string(), index: z.number().optional(), extract: z.string().optional() })),
    })
    .optional(),
});

export interface WebArticle {
  id: string;
  title: string;
  extract: string;
  url: string;
}

export function wikipediaUrl(query: string, limit = 6): string {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: String(limit),
    gsrnamespace: '0',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    exsentences: '2',
    exlimit: 'max',
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
  });
  return `https://en.wikipedia.org/w/api.php?${params}`;
}

export function normaliseWikipedia(raw: z.infer<typeof Response>): WebArticle[] {
  return (raw.query?.pages ?? [])
    .slice()
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
    .map((p) => ({
      id: String(p.pageid),
      title: p.title,
      extract: (p.extract ?? '').replace(/\s+/g, ' ').trim(),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    }))
    .filter((a) => a.title && a.extract);
}

export async function searchWikipedia(query: string): Promise<Cached<WebArticle[]>> {
  const q = query.trim();
  return cached(`wikipedia:${q.toLowerCase()}`, TTL, async () => normaliseWikipedia(await fetchJson(wikipediaUrl(q), { providerId: WIKIPEDIA_ID, schema: Response })));
}
