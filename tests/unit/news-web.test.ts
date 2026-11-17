import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { flagUrl } from '@/components/common/flagUrls';
import { diversify } from '@/features/home/LatestNews';
import { startingPoints } from '@/features/home/QuickFinder';
import { gdeltUrl, isSearchable, normaliseGdelt, tidyTitle } from '@/services/api/providers/gdelt';
import { normaliseWikipedia, wikipediaUrl } from '@/services/api/providers/wikipedia';
import { cleanSummary, clip, isTradeRelevant, looksEnglish, NEWS_FEEDS, parseFeed, stripHtml, tagCategories, toNewsItems } from '@/services/news/parse';
import { applyTheme, nextTheme, readTheme } from '@/hooks/useTheme';
import { Authority, NewsFile } from '@/types/schemas';
import { z } from 'zod';

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>
<item><title>South Africa notifies safeguard investigation into non-wired fabrics</title><link>http://example.org/a</link><pubDate>Wed, 11 Nov 2026 10:00:00 GMT</pubDate>
<description><![CDATA[<p>On 11 November 2026, South Africa notified the WTO &amp; members of a safeguard investigation.</p>]]></description><content><![CDATA[<p>FULL BODY SHOULD NEVER BE KEPT</p>]]></content></item>
<item><title>Future item</title><link>https://example.org/f</link><pubDate>Wed, 11 Nov 2099 10:00:00 GMT</pubDate><description>x</description></item>
<item><title>Bad link item here</title><link>javascript:alert(1)</link><pubDate>Wed, 11 Nov 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

describe('news feed parsing', () => {
  const wto = NEWS_FEEDS[0]!;
  it('parses RSS, upgrades http links, strips markup and never keeps article bodies', () => {
    const items = toNewsItems(parseFeed(RSS), wto, '2026-11-17');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ url: 'https://example.org/a', publishedOn: '2026-11-11' });
    expect(items[0]!.summary).toBe('On 11 November 2026, South Africa notified the WTO & members of a safeguard investigation.');
    expect(JSON.stringify(items)).not.toContain('FULL BODY');
  });
  it('drops future-dated items and non-https links instead of repairing them', () => {
    const urls = toNewsItems(parseFeed(RSS), wto, '2026-11-17').map((i) => i.url);
    expect(urls).toEqual(['https://example.org/a']);
  });
  it('rejects a document that is not RSS', () => {
    expect(() => parseFeed('<html><body>Just a moment</body></html>')).toThrow();
  });
  it('strips tags and decodes entities', () => {
    expect(stripHtml('<p>Trade&nbsp;&amp; <b>shipping</b> &#8217;26</p>')).toBe('Trade & shipping ’26');
  });
  it('clips at a word boundary with an ellipsis', () => {
    const out = clip('alpha beta gamma delta epsilon zeta', 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith('…')).toBe(true);
  });
  it('every configured feed has https URL and a sourceId', () => {
    for (const f of NEWS_FEEDS) {
      expect(f.feedUrl.startsWith('https://')).toBe(true);
      expect(f.sourceId.length).toBeGreaterThan(2);
    }
  });
});

describe('summary cleaning', () => {
  it('removes feed boilerplate and repeated headlines', () => {
    const headline = 'Can T&T turn export potential into earnings?';
    expect(cleanSummary(`${headline} Anonymous (not verified) Tue, 17/11/2026 - 01:00 Date of publication Mon, 16/11/2026 - 12:00`, headline)).toBe('');
    expect(cleanSummary('Source The Astana Times External ID 2d489eeb-e6ae-42dd-b369-b928dbeb0608 Url https://astanatimes.com/x', 'x')).toBe('');
    expect(cleanSummary('European Commission Press release Brussels, 16 Nov 2026 Today, the Commission proposed new rules for customs.', 'y')).toBe('Today, the Commission proposed new rules for customs.');
  });
});

describe('language and relevance filters', () => {
  it('keeps English headlines', () => {
    for (const t of ['Members review progress in resolving SPS trade concerns at WTO', 'WTO members back new fisheries rules', 'Trade Policy Review: Viet Nam']) expect(looksEnglish(t), t).toBe(true);
  });
  it('drops Spanish, French and Tetum items', () => {
    expect(looksEnglish('Argentina recupera presencia en la red mundial de agencias de promoción')).toBe(false);
    expect(looksEnglish('Le commerce mondial atteint un record pour les pays en développement dans le monde')).toBe(false);
    expect(looksEnglish('TradeInvest Hametin Kapasidade Ba Tratadu Investimentu iha Timor Leste')).toBe(false);
  });
  it('treats only genuine trade and shipping topics as relevant', () => {
    expect(isTradeRelevant('EU launches safeguard investigation on certain PET resin chemicals')).toBe(true);
    expect(isTradeRelevant('Container shipping rates fall as port congestion eases')).toBe(true);
    expect(isTradeRelevant('Global life expectancy bounces back to near pre-pandemic levels')).toBe(false);
    expect(isTradeRelevant('Commission partially greenlights Romania’s fifth payment request')).toBe(false);
    expect(isTradeRelevant('COP31 enters decisive week as climate talks face political test')).toBe(false);
  });
  it('tags up to three topics and falls back to the feed default', () => {
    expect(tagCategories('Electronic Bill of Lading adoption grows at ports', 'international-trade')).toEqual(expect.arrayContaining(['ports', 'technology']));
    expect(tagCategories('A ceremony took place', 'international-trade')).toEqual(['international-trade']);
    expect(tagCategories('trade tariffs customs shipping ports logistics', 'international-trade').length).toBeLessThanOrEqual(3);
  });
});

describe('published news snapshot', () => {
  const file = NewsFile.parse(JSON.parse(readFileSync(resolve(__dirname, '../../public/data/news/latest.json'), 'utf8')));
  it('has unique ids and https links, no future dates, and only English items', () => {
    expect(new Set(file.items.map((i) => i.id)).size).toBe(file.items.length);
    for (const i of file.items) {
      expect(i.url.startsWith('https://')).toBe(true);
      expect(i.publishedOn <= file.retrievedOn).toBe(true);
      expect(looksEnglish(`${i.headline} ${i.summary}`)).toBe(true);
    }
  });
});

describe('Wikipedia adapter', () => {
  it('builds a keyless cross-origin query', () => {
    const url = wikipediaUrl('Bill of lading');
    expect(url).toContain('origin=*');
    expect(url).toContain('gsrsearch=Bill+of+lading');
  });
  it('orders by relevance, builds article URLs and drops empty extracts', () => {
    const out = normaliseWikipedia({
      query: {
        pages: [
          { pageid: 2, title: 'Bill of lading', index: 2, extract: 'A  document issued by a carrier.' },
          { pageid: 1, title: 'Incoterms', index: 1, extract: 'Pre-defined commercial terms.' },
          { pageid: 3, title: 'Empty', index: 3, extract: '' },
        ],
      },
    });
    expect(out.map((a) => a.title)).toEqual(['Incoterms', 'Bill of lading']);
    expect(out[1]).toMatchObject({ url: 'https://en.wikipedia.org/wiki/Bill_of_lading', extract: 'A document issued by a carrier.' });
  });
  it('returns nothing when there are no matches', () => {
    expect(normaliseWikipedia({})).toEqual([]);
  });
});

describe('GDELT adapter', () => {
  it('tidies stray spaces around punctuation', () => {
    expect(tidyTitle('CMA CGM Net Profit Triples to $2 . 32 Billion as Rates Surge , Says Report')).toBe('CMA CGM Net Profit Triples to $2.32 Billion as Rates Surge, Says Report');
  });
  it('normalises, dates, dedupes and drops non-English or invalid items', () => {
    const out = normaliseGdelt({
      articles: [
        { url: 'http://www.gcaptain.com/a', title: 'Container shipping faces pressure', seendate: '20261113T180000Z', domain: 'www.gcaptain.com', language: 'English' },
        { url: 'https://www.gcaptain.com/a', title: 'Container shipping faces pressure', seendate: '20261113T180000Z', domain: 'gcaptain.com', language: 'English' },
        { url: 'https://example.fr/b', title: 'Le transport maritime', seendate: '20261113T180000Z', domain: 'example.fr', language: 'French' },
        { url: 'javascript:alert(1)', title: 'Bad link here', seendate: '20261113T180000Z', domain: 'x.com', language: 'English' },
        { url: 'https://example.org/c', title: 'No date item', seendate: 'garbage', domain: 'example.org', language: 'English' },
      ],
    });
    expect(out).toEqual([{ id: 'https://www.gcaptain.com/a', title: 'Container shipping faces pressure', domain: 'gcaptain.com', publishedOn: '2026-11-13', url: 'https://www.gcaptain.com/a' }]);
  });
  it('handles an empty response', () => {
    expect(normaliseGdelt({})).toEqual([]);
  });
  it('refuses queries the service would reject, and requests English only', () => {
    expect(isSearchable('IN')).toBe(false);
    expect(isSearchable('container shipping')).toBe(true);
    expect(isSearchable('  ')).toBe(false);
    expect(decodeURIComponent(gdeltUrl('port strike'))).toContain('sourcelang:english');
  });
});

describe('theme', () => {
  it('cycles automatic → light → dark → automatic', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
  it('applies an explicit choice and removes it for automatic', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
  it('reads a saved choice and ignores junk', () => {
    window.localStorage.setItem('eport:theme', JSON.stringify('light'));
    expect(readTheme()).toBe('light');
    window.localStorage.setItem('eport:theme', JSON.stringify('purple'));
    expect(readTheme()).toBe('system');
    window.localStorage.clear();
  });
});

describe('quick finder and news selection', () => {
  const authorities = z.array(Authority).parse(JSON.parse(readFileSync(resolve(__dirname, '../../public/data/authorities/in.json'), 'utf8')));
  const ids = (country: string, dir: 'export' | 'import') => startingPoints(authorities, country, dir).map((a) => a.id);
  it('lists typical export authorities for India and not food-safety importers', () => {
    expect(ids('IN', 'export')).toEqual(expect.arrayContaining(['in-dgft', 'in-cbic', 'in-apeda', 'in-ecgc']));
    expect(ids('IN', 'export')).not.toContain('in-fssai');
  });
  it('lists import-side regulators for India', () => {
    expect(ids('IN', 'import')).toEqual(expect.arrayContaining(['in-dgft', 'in-cbic', 'in-fssai', 'in-bis']));
    expect(ids('IN', 'import')).not.toContain('in-apeda');
  });
  it('returns nothing for a country with no published authorities rather than guessing', () => {
    expect(ids('DE', 'export')).toEqual([]);
  });
  it('shows newest items round-robin across publishers', () => {
    const items = [
      { publisherName: 'A', publishedOn: '2026-11-17', id: 'a1' },
      { publisherName: 'A', publishedOn: '2026-11-16', id: 'a2' },
      { publisherName: 'A', publishedOn: '2026-11-15', id: 'a3' },
      { publisherName: 'B', publishedOn: '2026-11-10', id: 'b1' },
      { publisherName: 'C', publishedOn: '2026-11-09', id: 'c1' },
    ];
    // First round: each publisher's newest item (newest first); then the second round begins.
    expect(diversify(items, 4).map((i) => i.id)).toEqual(['a1', 'b1', 'c1', 'a2']);
    expect(new Set(diversify(items, 3).map((i) => i.publisherName)).size).toBe(3);
  });
});

describe('flags', () => {
  it('resolves ISO alpha-2 codes (any case) and returns null for unknown codes', () => {
    expect(flagUrl('IN')).toMatch(/\.svg|^data:image\/svg/);
    expect(flagUrl('de')).toMatch(/\.svg|^data:image\/svg/);
    expect(flagUrl('IN')).not.toBe(flagUrl('DE'));
    expect(flagUrl('xx')).toBeNull();
  });
});
