/**
 * Generates public/data/countries/index.json from the openly licensed
 * mledoze/countries dataset (npm: world-countries, ODbL 1.0).
 *
 * Only reference facts are taken. No trade rules or statistics come from this source.
 * Re-run after upgrading the package: `npm run data:countries`.
 */
import countries from 'world-countries';
import { z } from 'zod';
import { Country } from '../src/types/schemas';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, dataPath, writeJson } from './lib';

const records = countries
  .map((c) => ({
    id: c.cca2,
    cca2: c.cca2,
    cca3: c.cca3,
    ccn3: c.ccn3 ? c.ccn3.padStart(3, '0') : null,
    name: c.name.common,
    officialName: c.name.official,
    region: c.region || 'Other',
    subregion: c.subregion || null,
    capital: c.capital ?? [],
    currencies: Object.entries(c.currencies ?? {}).map(([code, v]) => ({
      code,
      name: v.name,
      symbol: v.symbol || null,
    })),
    languages: Object.values(c.languages ?? {}),
    latlng: c.latlng?.length === 2 ? ([c.latlng[0], c.latlng[1]] as [number, number]) : null,
    landlocked: Boolean(c.landlocked),
    unMember: Boolean(c.unMember),
    isoStatus: c.status,
    borders: c.borders ?? [],
    sourceIds: ['mledoze-countries'],
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const parsed = z.array(Country).parse(records);
writeJson('countries/index.json', parsed);
console.log(`countries/index.json — ${parsed.length} records`);

// Map geometry: Natural Earth 1:110m (public domain), packaged by world-atlas (ISC).
mkdirSync(dataPath('geo'), { recursive: true });
copyFileSync(resolve(ROOT, 'node_modules/world-atlas/countries-110m.json'), dataPath('geo/countries-110m.json'));
console.log('geo/countries-110m.json — copied');
