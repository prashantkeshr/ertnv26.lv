/**
 * Retrieves World Bank World Development Indicators and publishes them as static files:
 *   public/data/trade/indicators/index.json   — indicators, period, source dates, areas covered
 *   public/data/trade/indicators/<ISO3>.json  — one file per economy, plus WLD (world)
 *
 * Run manually (`npm run data:worldbank`) or via the refresh-data workflow. The snapshot is
 * committed so builds are reproducible and every figure carries a retrieval date.
 */
import { rmSync } from 'node:fs';
import {
  WORLD_BANK_INDICATORS,
  WORLD_BANK_PROVIDER_ID,
  WORLD_BANK_SOURCE_ID,
  normaliseWorldBankPage,
  worldBankUrl,
} from '../src/services/api/providers/worldbank';
import { IndicatorFile, IndicatorIndex, type IndicatorSeries } from '../src/types/schemas';
import { dataPath, loadSourceData, today, writeJson } from './lib';

const FROM = 2000;
const TO = new Date().getFullYear() - 1;
const { countries } = loadSourceData();
// Publish economies eport has a country record for, plus the world aggregate.
const wanted = new Set([...countries.map((c) => c.cca3), 'WLD']);

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt >= 3) throw new Error(`World Bank request failed after 3 attempts: ${url}\n${String(e)}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const areas = new Map<string, { name: string; series: IndicatorSeries[] }>();
const indicators: Array<{ indicatorId: string; name: string; unit: IndicatorSeries['unit'] }> = [];
let sourceLastUpdated = '';

for (const { indicatorId, unit } of WORLD_BANK_INDICATORS) {
  const byArea = new Map<string, { name: string; points: Array<{ year: number; value: number }> }>();
  let name: string | null = null;
  for (let page = 1, pages = 1; page <= pages; page++) {
    const result = normaliseWorldBankPage(await getJson(worldBankUrl(indicatorId, FROM, TO, page)));
    pages = result.pages;
    name ??= result.indicatorName;
    if (result.lastUpdated > sourceLastUpdated) sourceLastUpdated = result.lastUpdated;
    for (const o of result.observations) {
      if (!wanted.has(o.code)) continue;
      const entry = byArea.get(o.code) ?? { name: o.areaName, points: [] };
      entry.points.push({ year: o.year, value: o.value });
      byArea.set(o.code, entry);
    }
  }
  if (!name) throw new Error(`World Bank returned no rows for ${indicatorId}`);
  indicators.push({ indicatorId, name, unit });
  for (const [code, entry] of byArea) {
    const area = areas.get(code) ?? { name: entry.name, series: [] };
    area.series.push({ indicatorId, name, unit, points: entry.points.sort((a, b) => a.year - b.year) });
    areas.set(code, area);
  }
  console.log(`${indicatorId} — ${name}: ${byArea.size} areas`);
}

if (areas.size < 100) throw new Error(`Only ${areas.size} areas returned — refusing to overwrite the snapshot.`);

const retrievedOn = today();
rmSync(dataPath('trade/indicators'), { recursive: true, force: true });
for (const [code, area] of areas) {
  writeJson(
    `trade/indicators/${code}.json`,
    IndicatorFile.parse({
      area: { code, name: area.name },
      providerId: WORLD_BANK_PROVIDER_ID,
      sourceId: WORLD_BANK_SOURCE_ID,
      kind: 'historical-statistics',
      sourceLastUpdated,
      retrievedOn,
      series: area.series,
    }),
  );
}
writeJson(
  'trade/indicators/index.json',
  IndicatorIndex.parse({
    providerId: WORLD_BANK_PROVIDER_ID,
    sourceId: WORLD_BANK_SOURCE_ID,
    sourceLastUpdated,
    retrievedOn,
    period: { from: FROM, to: TO },
    indicators,
    areas: [...areas.keys()].sort(),
  }),
  true,
);
console.log(`Wrote ${areas.size} area files. Source last updated ${sourceLastUpdated}; retrieved ${retrievedOn}.`);
