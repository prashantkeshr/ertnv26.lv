/**
 * Data quality gate. Fails the build when any published dataset breaks a rule:
 *   - schema validity (every file, including derived indexes)
 *   - unique identifiers
 *   - every sourceId resolves to the source registry
 *   - every relation points at an existing record
 *   - country codes exist in the country dataset
 *   - no dates in the future; checked records carry a check method
 *   - catalog paths exist, unpublished datasets have no file claim
 */
import { z } from 'zod';
import { GraphFile, IndicatorFile, IndicatorIndex, LinkStatus, Manifest, NewsFile, SearchIndexFile } from '../src/types/schemas';
import { makeRef } from '../src/utils/entities';
import { dataExists, loadSourceData, parseDataset, today } from './lib';

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

let data: ReturnType<typeof loadSourceData>;
try {
  data = loadSourceData();
} catch (e) {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
}

function checkUnique(label: string, ids: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(`${label}: duplicate id "${id}"`);
    seen.add(id);
  }
}

checkUnique('countries', data.countries.map((c) => c.id));
checkUnique('countries (alpha-3)', data.countries.map((c) => c.cca3));
checkUnique('organizations', data.organizations.map((o) => o.id));
checkUnique('authorities', data.authorities.map((a) => a.id));
checkUnique('sources', data.sources.map((s) => s.id));
checkUnique('api-providers', data.providers.map((p) => p.id));
checkUnique('catalog', data.catalog.map((c) => c.id));

const sourceIds = new Set(data.sources.map((s) => s.id));
const countryIds = new Set(data.countries.map((c) => c.cca2));
const refs = new Set<string>([
  ...data.countries.map((c) => makeRef('country', c.cca2)),
  ...data.organizations.map((o) => makeRef('organization', o.id)),
  ...data.authorities.map((a) => makeRef('authority', a.id)),
]);
const now = today();

function checkRecord(
  label: string,
  r: {
    sourceIds: string[];
    relations?: Array<{ to: string }>;
    verification?: { status: string; lastChecked: string | null; method: string };
  },
) {
  for (const s of r.sourceIds) if (!sourceIds.has(s)) fail(`${label}: unknown sourceId "${s}"`);
  for (const rel of r.relations ?? []) if (!refs.has(rel.to)) fail(`${label}: relation to missing record "${rel.to}"`);
  const v = r.verification;
  if (v) {
    if (v.lastChecked && v.lastChecked > now) fail(`${label}: lastChecked ${v.lastChecked} is in the future`);
    if (v.lastChecked && v.method === 'none') fail(`${label}: has lastChecked but no check method`);
    if (!v.lastChecked && v.method !== 'none') fail(`${label}: has a check method but no lastChecked date`);
    if (v.status === 'officially-verified' && v.method !== 'editorial-review')
      fail(`${label}: "officially-verified" requires an editorial review, not just a link check`);
  }
}

for (const c of data.countries) checkRecord(`country ${c.id}`, c);
for (const o of data.organizations) {
  checkRecord(`organization ${o.id}`, o);
  if (!countryIds.has(o.headquarters.countryCode)) fail(`organization ${o.id}: unknown country ${o.headquarters.countryCode}`);
}
for (const a of data.authorities) {
  checkRecord(`authority ${a.id}`, a);
  if (!countryIds.has(a.jurisdiction)) fail(`authority ${a.id}: unknown jurisdiction ${a.jurisdiction}`);
  if (!a.id.startsWith(a.jurisdiction.toLowerCase() + '-')) fail(`authority ${a.id}: id must start with its jurisdiction code`);
}
for (const code of Object.keys(data.coverage.countries)) {
  if (!countryIds.has(code)) fail(`coverage: unknown country ${code}`);
}
for (const p of data.providers) {
  if (p.browserAccess !== 'not-tested' && !p.browserAccessCheckedOn) fail(`api-provider ${p.id}: browser access result without a check date`);
  if (p.integrationStatus === 'integrated' && p.browserAccess !== 'verified') fail(`api-provider ${p.id}: integrated without verified browser access`);
  if (p.integrationStatus === 'integrated' && p.auth !== 'none') fail(`api-provider ${p.id}: an integrated provider must not need credentials`);
}
for (const entry of data.catalog) {
  for (const s of entry.sourceIds) if (!sourceIds.has(s)) fail(`catalog ${entry.id}: unknown sourceId "${s}"`);
  if (entry.path && entry.coverage === 'unavailable') fail(`catalog ${entry.id}: has a file but is marked unavailable`);
  if (!entry.path && entry.coverage !== 'unavailable') fail(`catalog ${entry.id}: no file but not marked unavailable`);
  if (entry.path && !entry.generated && !dataExists(entry.path)) fail(`catalog ${entry.id}: missing file ${entry.path}`);
  if (entry.path && !entry.lastUpdated) fail(`catalog ${entry.id}: published dataset needs lastUpdated`);
}

// Derived files (present after `npm run data:build`).
const derived: Array<[string, z.ZodType<unknown>]> = [
  ['manifest.json', Manifest],
  ['graph/index.json', GraphFile],
  ['search/index.json', SearchIndexFile],
  ['sources/link-status.json', LinkStatus],
];
for (const [path, schema] of derived) {
  if (!dataExists(path)) {
    if (path !== 'sources/link-status.json') fail(`${path}: missing — run "npm run data:build"`);
    continue;
  }
  try {
    parseDataset(path, schema);
  } catch (e) {
    fail(String(e instanceof Error ? e.message : e));
  }
}
if (dataExists('search/index.json')) {
  const search = parseDataset('search/index.json', SearchIndexFile);
  checkUnique('search index', search.docs.map((d) => d.id));
}

// Statistical snapshot: every listed area has a valid file whose observations sit inside the stated period.
try {
  const index = parseDataset('trade/indicators/index.json', IndicatorIndex);
  if (!sourceIds.has(index.sourceId)) fail(`indicators: unknown sourceId "${index.sourceId}"`);
  if (index.retrievedOn > now) fail('indicators: retrievedOn is in the future');
  const cca3 = new Set([...data.countries.map((c) => c.cca3), 'WLD']);
  for (const code of index.areas) {
    if (!cca3.has(code)) fail(`indicators: area ${code} has no country record`);
    const file = parseDataset(`trade/indicators/${code}.json`, IndicatorFile);
    for (const s of file.series)
      for (const p of s.points)
        if (p.year < index.period.from || p.year > index.period.to) fail(`indicators ${code}: ${s.indicatorId} has year ${p.year} outside the stated period`);
  }
} catch (e) {
  fail(String(e instanceof Error ? e.message : e));
}

// News snapshot: valid items, known publishers, no duplicates, no future dates, retrieval date present.
try {
  const news = parseDataset('news/latest.json', NewsFile);
  if (news.retrievedOn > now) fail('news: retrievedOn is in the future');
  checkUnique('news ids', news.items.map((i) => i.id));
  checkUnique('news urls', news.items.map((i) => i.url));
  for (const f of news.feeds) if (!sourceIds.has(f.sourceId)) fail(`news feed: unknown sourceId "${f.sourceId}"`);
  for (const i of news.items) {
    if (!sourceIds.has(i.sourceId)) fail(`news ${i.id}: unknown sourceId "${i.sourceId}"`);
    if (i.publishedOn > now) fail(`news ${i.id}: publishedOn ${i.publishedOn} is in the future`);
  }
  const ageDays = (Date.parse(now) - Date.parse(news.retrievedOn)) / 86_400_000;
  if (ageDays > 14) console.warn(`⚠ News snapshot is ${Math.round(ageDays)} days old — the refresh job may have stopped.`);
} catch (e) {
  fail(String(e instanceof Error ? e.message : e));
}

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `Data valid — ${data.countries.length} countries, ${data.organizations.length} organizations, ` +
    `${data.authorities.length} authorities, ${data.sources.length} sources, ${data.providers.length} API providers.`,
);
