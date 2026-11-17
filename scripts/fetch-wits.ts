/**
 * Builds the worldwide bilateral-trade snapshot from World Bank WITS:
 *   public/data/trade/partners/<ISO3>.json   one file per reporting country
 *   public/data/trade/partners/index.json    which reporters exist, year, units
 *
 *   npm run data:wits              fetch everything
 *   npm run data:wits -- --resume  skip reporters that already have a file for the year
 *
 * Polite by design: four reporters at a time, retries on server errors and timeouts. WITS answers
 * HTTP 404 "NoRecordsFound" for a country it has no data for; such a reporter is simply not
 * published (and the interface says so). Nothing is estimated.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parsePartners, parseSectors, witsUrl, WITS_ID, type Flow } from '../src/services/api/providers/wits';
import { TradePartnersFile, TradePartnersIndex } from '../src/types/schemas';
import { dataPath, loadSourceData, today, writeJson } from './lib';

const YEAR = 2023;
const CONCURRENCY = 4;
const resume = process.argv.includes('--resume');
const { countries } = loadSourceData();
const codes = new Set(countries.map((c) => c.cca3));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fetched = { kind: 'data'; json: unknown } | { kind: 'none' } | { kind: 'failed' };

async function get(url: string): Promise<Fetched> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { 'User-Agent': 'eport-data-build/1.0 (+https://eport.live)' } });
      const text = await res.text();
      if (res.status === 404 || /NoRecordsFound/i.test(text)) return { kind: 'none' };
      if (res.ok && text.startsWith('{')) return { kind: 'data', json: JSON.parse(text) };
      // 5xx, throttling or a malformed body: wait and try again.
    } catch {
      /* network error or timeout: retry */
    }
    await sleep(1500 * attempt);
  }
  return { kind: 'failed' };
}

async function fetchReporter(c: (typeof countries)[number]): Promise<'published' | 'none' | 'failed'> {
  const parts = {} as Record<Flow, { world: number | null; partners: Array<[string, number]> }>;
  const sectors = {} as Record<Flow, Array<[string, number]>>;
  for (const flow of ['exports', 'imports'] as const) {
    const p = await get(witsUrl(c.cca3, YEAR, flow, 'partners'));
    if (p.kind === 'failed') return 'failed';
    parts[flow] = p.kind === 'data' ? parsePartners(p.json, codes) : { world: null, partners: [] };
    sectors[flow] = [];
    if (parts[flow].partners.length) {
      const s = await get(witsUrl(c.cca3, YEAR, flow, 'sectors'));
      if (s.kind === 'failed') return 'failed';
      if (s.kind === 'data') sectors[flow] = parseSectors(s.json);
    }
  }
  if (!parts.exports.partners.length && !parts.imports.partners.length) return 'none';
  writeJson(
    `trade/partners/${c.cca3}.json`,
    TradePartnersFile.parse({
      reporter: c.cca3,
      year: YEAR,
      unit: 'US$ thousand',
      sourceId: WITS_ID,
      retrievedOn: today(),
      totals: { exports: parts.exports.world, imports: parts.imports.world },
      exports: parts.exports.partners,
      imports: parts.imports.partners,
      sectors,
    }),
  );
  return 'published';
}

const hasFile = (iso3: string) => {
  if (!existsSync(dataPath(`trade/partners/${iso3}.json`))) return false;
  try {
    return TradePartnersFile.parse(JSON.parse(readFileSync(dataPath(`trade/partners/${iso3}.json`), 'utf8'))).year === YEAR;
  } catch {
    return false;
  }
};

const queue = countries.filter((c) => !(resume && hasFile(c.cca3)));
const tally = { published: 0, none: 0, failed: 0 };
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < queue.length) {
      const c = queue[next++]!;
      const result = await fetchReporter(c);
      tally[result]++;
      console.log(`${result === 'published' ? '✓' : result === 'none' ? '–' : '✗'} ${c.cca3} ${c.name}: ${result}`);
    }
  }),
);

const onDisk = readdirSync(dataPath('trade/partners'))
  .filter((f) => /^[A-Z]{3}\.json$/.test(f))
  .map((f) => f.slice(0, 3))
  .sort();
writeJson(
  'trade/partners/index.json',
  TradePartnersIndex.parse({
    year: YEAR,
    unit: 'US$ thousand',
    sourceId: WITS_ID,
    retrievedOn: today(),
    reporters: onDisk,
    note: 'Merchandise trade as reported by each reporting country (mirrored from UN Comtrade by the World Bank WITS). Totals for the same flow reported by the two sides of a pair rarely match.',
  }),
  true,
);
console.log(`\nPublished ${onDisk.length} reporters for ${YEAR}. This run: ${tally.published} fetched, ${tally.none} with no data, ${tally.failed} failed (re-run with --resume to retry).`);
if (tally.failed) process.exitCode = 1;
