/**
 * Computes countries/featured.json — the largest economies in each region, used by the
 * Countries mega menu. Ranked by exports of goods and services (World Bank, newest year with data),
 * so the list is derived from real data, not hand-picked.
 */
import { existsSync, readFileSync } from 'node:fs';
import { FeaturedCountries, IndicatorFile, IndicatorIndex } from '../src/types/schemas';
import { dataPath, loadSourceData, writeJson } from './lib';

const PER_REGION = 12;
const INDICATOR = 'NE.EXP.GNFS.CD';
const { countries } = loadSourceData();
const index = IndicatorIndex.parse(JSON.parse(readFileSync(dataPath('trade/indicators/index.json'), 'utf8')));
const meta = index.indicators.find((i) => i.indicatorId === INDICATOR);
if (!meta) throw new Error(`Indicator ${INDICATOR} missing from the snapshot`);

const byRegion = new Map<string, Array<{ code: string; name: string; year: number; value: number }>>();
for (const c of countries) {
  if (!index.areas.includes(c.cca3) || !existsSync(dataPath(`trade/indicators/${c.cca3}.json`))) continue;
  const file = IndicatorFile.parse(JSON.parse(readFileSync(dataPath(`trade/indicators/${c.cca3}.json`), 'utf8')));
  const last = file.series.find((s) => s.indicatorId === INDICATOR)?.points.at(-1);
  if (!last) continue;
  byRegion.set(c.region, [...(byRegion.get(c.region) ?? []), { code: c.cca2, name: c.name, year: last.year, value: last.value }]);
}

const regions = Object.fromEntries(
  [...byRegion].sort(([a], [b]) => a.localeCompare(b)).map(([region, list]) => [region, list.sort((a, b) => b.value - a.value).slice(0, PER_REGION)]),
);

writeJson(
  'countries/featured.json',
  FeaturedCountries.parse({
    retrievedOn: index.retrievedOn,
    basis: { indicatorId: INDICATOR, indicatorName: meta.name, sourceId: index.sourceId, rule: `The ${PER_REGION} economies in each region with the highest value of this indicator in their latest reported year. Regions without trade indicators are omitted.` },
    regions,
  }),
);
console.log(`countries/featured.json — ${Object.keys(regions).length} regions: ${Object.entries(regions).map(([r, l]) => `${r}(${l.length})`).join(', ')}`);
