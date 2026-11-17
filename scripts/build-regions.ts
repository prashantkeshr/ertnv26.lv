/**
 * Derives trade/regions.json from the per-country WITS files: for each region, how much its
 * reporting countries export and import, where those exports go (by destination region), the
 * sector mix, and the largest country-to-country lanes. Pure aggregation of published data —
 * nothing is estimated, and countries without a report are simply not included in the sums.
 */
import { readFileSync } from 'node:fs';
import { RegionTradeFile, TradePartnersFile, TradePartnersIndex } from '../src/types/schemas';
import { dataPath, loadSourceData, writeJson } from './lib';

const { countries } = loadSourceData();
const index = TradePartnersIndex.parse(JSON.parse(readFileSync(dataPath('trade/partners/index.json'), 'utf8')));
const byIso3 = new Map(countries.map((c) => [c.cca3, c]));
const regionNames = [...new Set(countries.map((c) => c.region))].sort();

type Lane = [string, string, number];
const acc = Object.fromEntries(
  regionNames.map((r) => [
    r,
    { countries: countries.filter((c) => c.region === r).length, reporters: 0, exports: 0, imports: 0, destinations: {} as Record<string, number>, sectors: new Map<string, number>(), lanes: [] as Lane[] },
  ]),
);
const allLanes: Lane[] = [];

for (const iso3 of index.reporters) {
  const c = byIso3.get(iso3)!;
  const f = TradePartnersFile.parse(JSON.parse(readFileSync(dataPath(`trade/partners/${iso3}.json`), 'utf8')));
  const r = acc[c.region]!;
  r.reporters++;
  r.exports += f.totals.exports ?? f.exports.reduce((s, [, v]) => s + v, 0);
  r.imports += f.totals.imports ?? f.imports.reduce((s, [, v]) => s + v, 0);
  for (const [partner, value] of f.exports) {
    const p = byIso3.get(partner);
    if (!p) continue;
    r.destinations[p.region] = (r.destinations[p.region] ?? 0) + value;
    const lane: Lane = [c.cca2, p.cca2, value];
    r.lanes.push(lane);
    allLanes.push(lane);
  }
  for (const [sector, value] of f.sectors.exports) r.sectors.set(sector, (r.sectors.get(sector) ?? 0) + value);
}

const top = (lanes: Lane[], n: number) => lanes.sort((a, b) => b[2] - a[2]).slice(0, n);
const regions = Object.fromEntries(
  Object.entries(acc)
    .filter(([, r]) => r.reporters > 0)
    .map(([name, r]) => [
      name,
      { countries: r.countries, reporters: r.reporters, exports: r.exports, imports: r.imports, destinations: r.destinations, sectors: [...r.sectors].sort((a, b) => b[1] - a[1]), lanes: top(r.lanes, 10) },
    ]),
);

writeJson('trade/regions.json', RegionTradeFile.parse({ year: index.year, unit: 'US$ thousand', sourceId: index.sourceId, retrievedOn: index.retrievedOn, lanes: top(allLanes, 12), regions }));
console.log(`trade/regions.json — ${Object.keys(regions).length} regions from ${index.reporters.length} reporters; top lane ${top(allLanes, 1)[0]!.join('→')}`);
