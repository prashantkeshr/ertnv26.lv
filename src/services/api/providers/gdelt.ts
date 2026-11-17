/**
 * GDELT DOC 2.0 API — live news headlines for the search page and the News page.
 * Registry id: "gdelt". No key; browser access verified 2026-11-17 (Access-Control-Allow-Origin: *).
 *
 * Only headline, publisher domain and date are shown, each linking to the original article.
 * Sources are not vetted by eport, so results are labelled as unverified.
 * The service allows one request per ~5 seconds per client; calls are spaced here and
 * answered from a 30-minute cache whenever possible.
 */
import { z } from 'zod';
import { cached, type Cached } from '../cache';
import { fetchJson } from '../http';

export const GDELT_ID = 'gdelt';
const TTL = 30 * 60_000;
export const GDELT_MIN_INTERVAL_MS = 5_200;

const Response = z.object({
  articles: z.array(z.object({ url: z.string(), title: z.string(), seendate: z.string(), domain: z.string(), language: z.string().optional() })).optional(),
});

export interface WebHeadline {
  id: string;
  title: string;
  domain: string;
  /** ISO date (YYYY-MM-DD). */
  publishedOn: string;
  url: string;
}

export function gdeltUrl(query: string, limit = 8): string {
  const params = new URLSearchParams({ query: `${query} sourcelang:english`, mode: 'artlist', maxrecords: String(limit), format: 'json', sort: 'datedesc' });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
}

/** GDELT titles carry stray spaces around punctuation ("$2 . 32 Billion"); tidy the obvious cases only. */
export function tidyTitle(title: string): string {
  return title
    .replace(/(\d)\s+\.\s+(\d)/g, '$1.$2')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function seenDate(s: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function normaliseGdelt(raw: z.infer<typeof Response>): WebHeadline[] {
  const seen = new Set<string>();
  const out: WebHeadline[] = [];
  for (const a of raw.articles ?? []) {
    const url = a.url.replace(/^http:\/\//i, 'https://');
    const date = seenDate(a.seendate);
    const title = tidyTitle(a.title);
    if (!/^https:\/\/[^\s]+$/.test(url) || !date || title.length < 5) continue;
    if (a.language && a.language.toLowerCase() !== 'english') continue;
    const key = title.toLowerCase();
    if (seen.has(url) || seen.has(key)) continue;
    seen.add(url);
    seen.add(key);
    out.push({ id: url, title, domain: a.domain.replace(/^www\./, ''), publishedOn: date, url });
  }
  return out;
}

let lastCall = 0;
let chain: Promise<unknown> = Promise.resolve();

/** Serialises calls and leaves ≥5.2 s between them, so rapid searches queue instead of failing with HTTP 429. */
function spaced<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastCall + GDELT_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return task();
  });
  chain = run.catch(() => undefined);
  return run;
}

/** Queries with a term shorter than 3 characters are rejected by the service, so they are not sent. */
export function isSearchable(query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => w.length >= 3);
}

export async function searchHeadlines(query: string): Promise<Cached<WebHeadline[]>> {
  const q = query.trim();
  if (!isSearchable(q)) return { data: [], fetchedAt: new Date().toISOString(), stale: false };
  return cached(`gdelt:${q.toLowerCase()}`, TTL, () => spaced(async () => normaliseGdelt(await fetchJson(gdeltUrl(q), { providerId: GDELT_ID, schema: Response, timeoutMs: 20_000 }))));
}
