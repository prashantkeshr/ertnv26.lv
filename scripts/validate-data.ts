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
import { CountryGuide, CountryPortals, DocumentsFile, GlobalGuide, GlossaryFile, IncotermsFile, FeaturedCountries, GraphFile, IndicatorFile, IndicatorIndex, LinkStatus, Manifest, NewsFile, SearchIndexFile, TradePartnersFile, TradePartnersIndex, VideosFile } from '../src/types/schemas';
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

// Worldwide trade snapshot: every file valid, matches its country, and the index lists exactly the files that exist.
try {
  const tindex = parseDataset('trade/partners/index.json', TradePartnersIndex);
  if (!sourceIds.has(tindex.sourceId)) fail(`trade partners: unknown sourceId "${tindex.sourceId}"`);
  const cca3 = new Map(data.countries.map((c) => [c.cca3, c.cca2]));
  checkUnique('trade reporters', tindex.reporters);
  for (const code of tindex.reporters) {
    if (!cca3.has(code)) fail(`trade partners: reporter ${code} is not a country in the dataset`);
    const f = parseDataset(`trade/partners/${code}.json`, TradePartnersFile);
    if (f.reporter !== code) fail(`trade partners ${code}: file names reporter ${f.reporter}`);
    if (f.year !== tindex.year) fail(`trade partners ${code}: year ${f.year} differs from the index year ${tindex.year}`);
    for (const [p] of [...f.exports, ...f.imports]) if (!cca3.has(p)) fail(`trade partners ${code}: unknown partner ${p}`);
    if (f.exports.some(([p]) => p === code) || f.imports.some(([p]) => p === code)) fail(`trade partners ${code}: lists itself as a partner`);
    if (f.exports.length === 0 && f.imports.length === 0) fail(`trade partners ${code}: published with no partner data`);
    for (let i = 1; i < f.exports.length; i++) if (f.exports[i - 1]![1] < f.exports[i]![1]) fail(`trade partners ${code}: exports are not sorted`);
  }
} catch (e) {
  fail(String(e instanceof Error ? e.message : e));
}

// Videos, country guides and featured countries.
try {
  const { videos } = parseDataset('videos/index.json', VideosFile);
  checkUnique('videos', videos.map((v) => v.id));
  for (const v of videos) {
    if (!sourceIds.has(v.sourceId)) fail(`video ${v.id}: unknown sourceId "${v.sourceId}"`);
    if (v.verifiedOn > now) fail(`video ${v.id}: verifiedOn is in the future`);
  }
  const guides = parseDataset('countries/guides.json', z.array(CountryGuide));
  const authorityIds = new Set(data.authorities.map((a) => a.id));
  for (const g of guides) {
    if (!countryIds.has(g.countryCode)) fail(`guide ${g.countryCode}: unknown country`);
    checkUnique(`guide ${g.countryCode} steps`, g.steps.map((st) => st.id));
    for (const sid of g.sourceIds) if (!sourceIds.has(sid)) fail(`guide ${g.countryCode}: unknown sourceId "${sid}"`);
    for (const st of g.steps) for (const aid of st.authorityIds) if (!authorityIds.has(aid)) fail(`guide ${g.countryCode} step ${st.id}: unknown authority "${aid}"`);
    // An unreviewed overview must never claim to be verified.
    if (g.status === 'officially-verified') fail(`guide ${g.countryCode}: marked officially-verified without an editorial-review record`);
  }
  const global = parseDataset('guides/global.json', GlobalGuide);
  checkUnique('global guide stages', global.stages.map((st) => st.id));
  const orgIds = new Set(data.organizations.map((o) => o.id));
  for (const sid of global.sourceIds) if (!sourceIds.has(sid)) fail(`global guide: unknown sourceId "${sid}"`);
  for (const st of global.stages) for (const oid of st.orgIds) if (!orgIds.has(oid)) fail(`global guide stage ${st.id}: unknown organization "${oid}"`);
  if (global.status === 'officially-verified') fail('global guide: marked officially-verified without an editorial-review record');
  const portals = parseDataset('countries/portals.json', CountryPortals);
  for (const code of Object.keys(portals.countries)) if (!countryIds.has(code)) fail(`portals: unknown country ${code}`);
  const inco = parseDataset('learning/incoterms.json', IncotermsFile);
  checkUnique('incoterms', inco.rules.map((r) => r.code));
  for (const sid of inco.sourceIds) if (!sourceIds.has(sid)) fail(`incoterms: unknown sourceId "${sid}"`);
  for (const r of inco.rules) {
    // Facts that hold for every Incoterms 2020 rule; a data edit that breaks one is a mistake, not an opinion.
    if (r.group === 'E' && r.exportClearance !== 'buyer') fail(`incoterms ${r.code}: only the E rule leaves export clearance to the buyer`);
    if (r.group !== 'E' && r.exportClearance !== 'seller') fail(`incoterms ${r.code}: seller clears export in every rule except EXW`);
    if ((r.group === 'C' || r.group === 'D') !== (r.mainCarriage === 'seller')) fail(`incoterms ${r.code}: the seller pays main carriage in C and D rules only`);
    if ((r.importClearance === 'seller') !== (r.code === 'DDP')) fail(`incoterms ${r.code}: only DDP puts import clearance on the seller`);
    if ((r.insurance === 'seller') !== (r.code === 'CIP' || r.code === 'CIF')) fail(`incoterms ${r.code}: only CIP and CIF oblige the seller to insure`);
    if ((r.modes === 'sea') !== ['FAS', 'FOB', 'CFR', 'CIF'].includes(r.code)) fail(`incoterms ${r.code}: only FAS, FOB, CFR and CIF are sea-only`);
  }
  const docs = parseDataset('learning/documents.json', DocumentsFile);
  const docIds = new Set(docs.documents.map((d) => d.id));
  checkUnique('documents', docs.documents.map((d) => d.id));
  for (const sid of docs.sourceIds) if (!sourceIds.has(sid)) fail(`documents: unknown sourceId "${sid}"`);
  const catIds = new Set(docs.categories.map((c) => c.id));
  for (const d of docs.documents) {
    if (!catIds.has(d.category)) fail(`document ${d.id}: category "${d.category}" is not declared`);
    for (const dep of d.dependsOn) if (!docIds.has(dep)) fail(`document ${d.id}: depends on unknown document "${dep}"`);
  }
  // A document cannot (even indirectly) depend on itself.
  const byDoc = new Map(docs.documents.map((d) => [d.id, d.dependsOn]));
  const visit = (id: string, trail: string[]): void => {
    if (trail.includes(id)) return void fail(`documents: dependency cycle ${[...trail, id].join(' → ')}`);
    for (const dep of byDoc.get(id) ?? []) visit(dep, [...trail, id]);
  };
  for (const id of byDoc.keys()) visit(id, []);
  const gloss = parseDataset('learning/glossary.json', GlossaryFile);
  const termIds = new Set(gloss.terms.map((t) => t.id));
  checkUnique('glossary terms', gloss.terms.map((t) => t.id));
  for (const sid of gloss.sourceIds) if (!sourceIds.has(sid)) fail(`glossary: unknown sourceId "${sid}"`);
  for (const t of gloss.terms) for (const ref of t.seeAlso) if (!termIds.has(ref)) fail(`glossary ${t.id}: seeAlso unknown term "${ref}"`);
  const featured = parseDataset('countries/featured.json', FeaturedCountries);
  for (const list of Object.values(featured.regions)) for (const c of list) if (!countryIds.has(c.code)) fail(`featured: unknown country ${c.code}`);
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
