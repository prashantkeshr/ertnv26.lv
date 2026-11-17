/**
 * RSS parsing and topic tagging for the build-time news snapshot.
 * Node-safe and pure (no I/O), so the same code is unit-tested and used by scripts/fetch-news.ts.
 *
 * Only what a publisher puts in its syndication feed is kept: headline, a short abstract,
 * date and link. Article bodies (e.g. <content>) are ignored.
 */
import { XMLParser } from 'fast-xml-parser';
import type { NewsCategory } from '@/types/schemas';

export interface NewsFeedConfig {
  sourceId: string;
  publisherName: string;
  feedUrl: string;
  defaultCategory: NewsCategory;
  /** Keep only items that match a trade/maritime topic rule (for general-interest feeds). */
  requireTopic: boolean;
}

/** Official and recognized publishers only. Each has a matching entry in the source registry. */
export const NEWS_FEEDS: NewsFeedConfig[] = [
  { sourceId: 'wto-news', publisherName: 'World Trade Organization', feedUrl: 'https://www.wto.org/library/rss/latest_news_e.xml', defaultCategory: 'international-trade', requireTopic: false },
  { sourceId: 'itc-news', publisherName: 'International Trade Centre', feedUrl: 'https://www.intracen.org/rss.xml', defaultCategory: 'international-trade', requireTopic: false },
  { sourceId: 'ec-trade-news', publisherName: 'European Commission', feedUrl: 'https://ec.europa.eu/commission/presscorner/api/rss?language=en&topic=trade', defaultCategory: 'international-trade', requireTopic: true },
  { sourceId: 'icc-news', publisherName: 'International Chamber of Commerce', feedUrl: 'https://iccwbo.org/feed/', defaultCategory: 'international-trade', requireTopic: true },
  { sourceId: 'un-news', publisherName: 'United Nations News', feedUrl: 'https://news.un.org/feed/subscribe/en/news/topic/economic-development/feed/rss.xml', defaultCategory: 'international-trade', requireTopic: true },
];

const TOPIC_RULES: Array<[NewsCategory, RegExp]> = [
  ['maritime-shipping', /\b(maritime|shipping|vessels?|ships?|seafarers?|container|containers|freight|tankers?|IMO|red sea|suez|panama canal)\b/i],
  ['ports', /\bports?\b/i],
  ['logistics', /\b(logistics|transport|cargo|warehous\w*|corridors?)\b/i],
  ['customs', /\b(customs|border|clearance|HS code|harmoni[sz]ed system)\b/i],
  ['tariffs', /\b(tariffs?|customs duty|customs duties|import duty|import duties|levy|levies|anti-?dumping|countervailing|safeguard (measures?|investigations?|duties))\b/i],
  ['agreements', /\b(agreements?|treaty|treaties|FTA|accession|negotiat\w*|ministerial conference)\b/i],
  ['supply-chains', /\b(supply[- ]chains?|supply disruptions?|sourcing|critical raw materials)\b/i],
  ['technology', /\b(digital|e-?commerce|AI|blockchain|paperless|electronic|ePhyto|single window)\b/i],
  ['sustainability', /\b(climate|emissions?|carbon|decarboni[sz]\w*|green|sustainab\w*|net.zero)\b/i],
  ['trade-finance', /\b(trade finance|letters? of credit|export credit|credit insurance|trade credit)\b/i],
  ['policy', /\b(policy|policies|regulations?|reform|sanctions?|export controls?)\b/i],
  ['international-trade', /\b(trade|trading|exports?|imports?|market access|commerce)\b/i],
];

/** Topic tags (max 3) from headline + summary; falls back to the feed's default. */
export function tagCategories(text: string, fallback: NewsCategory): NewsCategory[] {
  const found = TOPIC_RULES.filter(([, re]) => re.test(text)).map(([c]) => c);
  return (found.length ? found : [fallback]).slice(0, 3);
}

/** True when the text mentions trade, shipping, customs, tariffs, etc. ("policy" alone does not count). */
export function isTradeRelevant(text: string): boolean {
  return TOPIC_RULES.some(([cat, re]) => !['policy', 'technology', 'sustainability', 'agreements'].includes(cat) && re.test(text));
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };

export function stripHtml(input: string): string {
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,;:.–—-]+$/, '') + '…';
}

const FOREIGN = /\b(el|la|los|las|del|para|con|por|una|uno|que|sus|más|le|les|des|du|pour|avec|une|dans|est|sur|nos|nous|da|do|dos|das|não|und|der|die|das|mit|für)\b/gi;
const ENGLISH = /\b(the|of|and|to|in|for|with|on|is|are|its|at|by|as|from|new|how|will)\b/gi;

/**
 * Cheap English-language check for feeds that mix languages (e.g. ITC publishes Spanish and
 * French items). Errs toward keeping an item when unsure.
 */
export function looksEnglish(text: string): boolean {
  if (/[¿¡ñãõ]/i.test(text)) return false;
  const foreign = text.match(FOREIGN)?.length ?? 0;
  const english = text.match(ENGLISH)?.length ?? 0;
  if (foreign >= 2 && foreign > english) return false;
  // Longer text with no English function word at all is almost certainly another language (e.g. Tetum).
  return !(english === 0 && text.trim().split(/\s+/).length >= 6);
}

/**
 * Removes feed boilerplate from an abstract: a repeated headline, "Anonymous (not verified)",
 * "Date of publication …" and date stamps such as "Tue, 17/11/2026 - 01:00". Returns "" when
 * nothing meaningful is left.
 */
export function cleanSummary(summary: string, headline: string): string {
  let s = summary;
  if (s.toLowerCase().startsWith(headline.toLowerCase())) s = s.slice(headline.length);
  s = s
    .replace(/Source\s+.*?External ID\s+[0-9a-f-]{36}\s+Url\s+\S+/gi, ' ')
    .replace(/^(European Commission\s+)?Press release\s+[A-Z][A-Za-z]+,\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*/i, '')
    .replace(/Anonymous \(not verified\)/gi, ' ')
    .replace(/Date of publication/gi, ' ')
    .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}(\s*-\s*\d{1,2}:\d{2})?/gi, ' ')
    .replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}(\s*-\s*\d{1,2}:\d{2})?/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.–—-]+/, '')
    .trim();
  return s.length < 30 ? '' : s;
}

export interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true, processEntities: true });

const text = (v: unknown): string => (typeof v === 'string' ? v : v && typeof v === 'object' && '#text' in (v as object) ? String((v as { '#text': unknown })['#text']) : '');

/** Parses an RSS 2.0 document into raw items. Throws if the document is not an RSS feed. */
export function parseFeed(xml: string): RawFeedItem[] {
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: unknown } } };
  const channel = doc.rss?.channel;
  if (!channel) throw new Error('Not an RSS 2.0 feed');
  const items = channel.item === undefined ? [] : Array.isArray(channel.item) ? channel.item : [channel.item];
  return items.map((it) => {
    const o = it as Record<string, unknown>;
    return { title: text(o.title), link: text(o.link) || text(o.guid), description: text(o.description), pubDate: text(o.pubDate) || text(o['dc:date']) };
  });
}

export interface ParsedItem {
  headline: string;
  summary: string;
  url: string;
  publishedOn: string;
  categories: NewsCategory[];
}

/** Validates and normalises raw items. Items with a bad link or date are dropped, never repaired. */
export function toNewsItems(raw: RawFeedItem[], feed: NewsFeedConfig, today: string): ParsedItem[] {
  const out: ParsedItem[] = [];
  for (const r of raw) {
    const headline = clip(stripHtml(r.title), 300);
    const url = r.link.trim().replace(/^http:\/\//i, 'https://');
    const date = new Date(r.pubDate);
    if (headline.length < 5 || !/^https:\/\/[^\s]+$/.test(url) || Number.isNaN(date.getTime())) continue;
    const publishedOn = date.toISOString().slice(0, 10);
    if (publishedOn > today) continue;
    let summary = clip(cleanSummary(stripHtml(r.description), headline), 240);
    if (summary.toLowerCase() === headline.toLowerCase()) summary = '';
    const haystack = `${headline} ${summary}`;
    if (!looksEnglish(haystack)) continue;
    if (feed.requireTopic && !isTradeRelevant(haystack)) continue;
    out.push({ headline, summary, url, publishedOn, categories: tagCategories(haystack, feed.defaultCategory) });
  }
  return out;
}
