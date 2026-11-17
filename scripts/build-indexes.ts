/**
 * Derives three files from the published datasets:
 *   graph/index.json   — Global Trade Knowledge Graph (nodes + edges)
 *   search/index.json  — compact search documents
 *   manifest.json      — dataset catalog with counted records (feeds the Data Reliability Centre)
 *
 * Nothing here invents data: every node, edge and count comes from a published record.
 */
import { z } from 'zod';
import { allModules } from '../src/app/modules';
import { GraphFile, Manifest, SearchIndexFile, type GraphNode, type SearchDoc } from '../src/types/schemas';
import { entityPath, makeRef } from '../src/utils/entities';
import { dataExists, loadSourceData, readJson, today, writeJson } from './lib';

const data = loadSourceData();
const countryById = new Map(data.countries.map((c) => [c.cca2, c]));

/* ---------- knowledge graph ---------- */

const nodes: Record<string, GraphNode> = {};
const edges: Array<{ from: string; to: string; type: string; note?: string }> = [];

function addNode(ref: string, node: Omit<GraphNode, 'path'>) {
  const path = entityPath(ref);
  if (!path) throw new Error(`No page path for ${ref}`);
  nodes[ref] = { ...node, path };
}

function ensureCountryNode(code: string): string {
  const c = countryById.get(code);
  if (!c) throw new Error(`Unknown country code "${code}" referenced by a record`);
  const ref = makeRef('country', code);
  if (!nodes[ref]) addNode(ref, { type: 'country', label: c.name, meta: c.region });
  return ref;
}

for (const o of data.organizations.filter((r) => r.publicationStatus === 'published')) {
  const ref = makeRef('organization', o.id);
  addNode(ref, { type: 'organization', label: o.name, meta: o.abbreviation });
  edges.push({ from: ref, to: ensureCountryNode(o.headquarters.countryCode), type: 'headquartered-in' });
  for (const r of o.relations) edges.push({ from: ref, to: r.to, type: r.type, note: r.note });
}

for (const a of data.authorities.filter((r) => r.publicationStatus === 'published')) {
  const ref = makeRef('authority', a.id);
  addNode(ref, { type: 'authority', label: a.name, meta: a.abbreviation ?? undefined });
  edges.push({ from: ref, to: ensureCountryNode(a.jurisdiction), type: 'jurisdiction' });
  for (const r of a.relations) edges.push({ from: ref, to: r.to, type: r.type, note: r.note });
}

for (const e of edges) {
  if (!nodes[e.from] || !nodes[e.to]) throw new Error(`Graph edge references a missing record: ${e.from} → ${e.to}`);
}

const generatedAt = today();
writeJson('graph/index.json', GraphFile.parse({ generatedAt, nodes, edges }));

/* ---------- search index ---------- */

const qualityOf = (status: string) =>
  status === 'officially-verified' ? 1 : status === 'source-referenced' ? 0.9 : status === 'needs-review' ? 0.6 : 0.4;

const docs: SearchDoc[] = [];

for (const c of data.countries) {
  docs.push({
    id: makeRef('country', c.cca2),
    type: 'country',
    title: c.name,
    subtitle: [c.subregion ?? c.region, c.cca2, c.cca3].join(' · '),
    identifiers: [c.cca2, c.cca3, ...(c.ccn3 ? [c.ccn3] : []), ...c.currencies.map((x) => x.code)],
    keywords: [c.officialName, ...c.capital, c.region, c.subregion ?? '', ...c.currencies.map((x) => x.name)].join(' '),
    path: `/countries/${c.cca2}`,
    country: c.cca2,
    quality: data.coverage.countries[c.cca2] ? 1 : 0.85,
  });
}

for (const o of data.organizations.filter((r) => r.publicationStatus === 'published')) {
  docs.push({
    id: makeRef('organization', o.id),
    type: 'organization',
    title: o.name,
    subtitle: `${o.abbreviation} · ${o.headquarters.city}`,
    identifiers: [o.abbreviation],
    keywords: [o.summary, ...o.tradeRelevance].join(' '),
    path: `/directory/organizations/${o.id}`,
    country: null,
    quality: qualityOf(o.verification.status),
  });
}

for (const a of data.authorities.filter((r) => r.publicationStatus === 'published')) {
  const country = countryById.get(a.jurisdiction);
  docs.push({
    id: makeRef('authority', a.id),
    type: 'authority',
    title: a.name,
    subtitle: [a.abbreviation, country?.name].filter(Boolean).join(' · '),
    identifiers: a.abbreviation ? [a.abbreviation] : [],
    keywords: [a.summary, ...a.functions, a.parentBody ?? '', country?.name ?? ''].join(' '),
    path: `/directory/authorities/${a.id}`,
    country: a.jurisdiction,
    quality: qualityOf(a.verification.status),
  });
}

// Only modules with a working route are searchable — planned features never appear as results.
for (const m of allModules().filter((x) => x.path && (x.status === 'live' || x.status === 'foundation'))) {
  docs.push({
    id: makeRef('page', m.id),
    type: 'page',
    title: m.title,
    subtitle: m.division,
    identifiers: [],
    keywords: m.summary,
    path: m.path!,
    country: null,
    quality: 0.8,
  });
}

writeJson('search/index.json', SearchIndexFile.parse({ generatedAt, docs }));

/* ---------- manifest ---------- */

function countRecords(path: string): number | null {
  if (!dataExists(path)) throw new Error(`Catalog lists ${path} but the file does not exist`);
  const json = readJson(path) as unknown;
  if (Array.isArray(json)) return json.length; // also covers the land-dots coordinate list
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.docs)) return o.docs.length;
    if (Array.isArray(o.edges)) return o.edges.length;
    if (Array.isArray(o.areas)) return o.areas.length;
    if (Array.isArray(o.items)) return o.items.length;
    if (Array.isArray(o.videos)) return o.videos.length;
    if (Array.isArray(o.reporters)) return o.reporters.length;
    if (Array.isArray(o.lanes) && o.regions && typeof o.regions === 'object') return Object.keys(o.regions).length;
    if (o.regions && typeof o.regions === 'object') return Object.keys(o.regions).length;
    const geometries = (o.objects as { countries?: { geometries?: unknown[] } } | undefined)?.countries?.geometries;
    if (Array.isArray(geometries)) return geometries.length;
    if (o.countries && typeof o.countries === 'object') return Object.keys(o.countries).length;
  }
  return null;
}

// A dataset that states its own retrieval date (snapshots) is shown with that date, not a hand-typed one.
function retrievedOn(path: string): string | null {
  const json = readJson(path) as { retrievedOn?: unknown } | unknown[];
  const d = !Array.isArray(json) && typeof json.retrievedOn === 'string' ? json.retrievedOn : null;
  return d && /^d{4}-d{2}-d{2}$/.test(d) ? d : null;
}

const manifest = Manifest.parse({
  generatedAt,
  schemaVersion: 1,
  datasets: data.catalog.map((entry) => ({
    ...entry,
    records: entry.path ? countRecords(entry.path) : null,
    lastUpdated: entry.path ? (retrievedOn(entry.path) ?? entry.lastUpdated) : entry.lastUpdated,
  })),
});
writeJson('manifest.json', manifest, true);

const summary = z
  .array(z.string())
  .parse([
    `graph: ${Object.keys(nodes).length} nodes, ${edges.length} edges`,
    `search: ${docs.length} documents`,
    `manifest: ${manifest.datasets.length} datasets (${manifest.datasets.filter((d) => d.path).length} published)`,
  ]);
console.log(summary.join('\n'));
