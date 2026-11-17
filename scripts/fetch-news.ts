/**
 * Builds public/data/news/latest.json from the RSS feeds of official publishers
 * (see NEWS_FEEDS). Runs daily in CI (.github/workflows/refresh-news.yml) and on demand:
 *   npm run data:news
 *
 * Stores headline, the publisher's short abstract, date, topic tags and a link to the original.
 * A feed that fails keeps its previous items (flagged ok:false); if every feed fails the
 * existing file is left untouched and the script exits non-zero.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { NEWS_FEEDS, parseFeed, toNewsItems } from '../src/services/news/parse';
import { NewsFile, type NewsItem } from '../src/types/schemas';
import { dataPath, loadSourceData, today, writeJson } from './lib';

const PER_FEED = 10;
const MAX_ITEMS = 60;
const sources = new Set(loadSourceData().sources.map((s) => s.id));

const previous: NewsFile | null = existsSync(dataPath('news/latest.json')) ? NewsFile.parse(JSON.parse(readFileSync(dataPath('news/latest.json'), 'utf8'))) : null;
const date = today();
const items = new Map<string, NewsItem>();
const feeds: NewsFile['feeds'] = [];

for (const feed of NEWS_FEEDS) {
  if (!sources.has(feed.sourceId)) throw new Error(`News feed ${feed.sourceId} has no entry in sources.json`);
  try {
    const res = await fetch(feed.feedUrl, { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; eport-news/1.0; +https://eport.live)', Accept: 'application/rss+xml, application/xml, text/xml' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = toNewsItems(parseFeed(await res.text()), feed, date)
      .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn))
      .slice(0, PER_FEED);
    for (const p of parsed) {
      const id = createHash('sha1').update(p.url).digest('hex').slice(0, 12);
      items.set(id, { id, ...p, publisherName: feed.publisherName, sourceId: feed.sourceId });
    }
    feeds.push({ sourceId: feed.sourceId, publisherName: feed.publisherName, feedUrl: feed.feedUrl, ok: true, items: parsed.length });
    console.log(`✓ ${feed.publisherName}: ${parsed.length} items`);
  } catch (e) {
    const kept = previous?.items.filter((i) => i.sourceId === feed.sourceId) ?? [];
    for (const k of kept) items.set(k.id, k);
    feeds.push({ sourceId: feed.sourceId, publisherName: feed.publisherName, feedUrl: feed.feedUrl, ok: false, items: kept.length, note: `Feed unavailable on ${date}: ${e instanceof Error ? e.message : 'error'}. Showing the previous items.` });
    console.warn(`✗ ${feed.publisherName}: ${String(e)} — kept ${kept.length} previous`);
  }
}

if (!feeds.some((f) => f.ok)) {
  console.error('Every feed failed — leaving the existing news file untouched.');
  process.exit(1);
}

const sorted = [...items.values()].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || a.headline.localeCompare(b.headline)).slice(0, MAX_ITEMS);
writeJson('news/latest.json', NewsFile.parse({ retrievedOn: date, retrievedAt: new Date().toISOString(), feeds, items: sorted }), true);
console.log(`news/latest.json — ${sorted.length} items from ${feeds.filter((f) => f.ok).length}/${feeds.length} feeds`);
