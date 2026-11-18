/**
 * Checks which official country pages exist, and writes public/data/countries/portals.json.
 *
 *   npm run data:portals
 *
 * The links themselves are built from country codes (see src/features/countries/portals.ts);
 * this script only records which of them answered HTTP 200, so the site never shows a dead link.
 * A page that cannot be confirmed is left out — it is not assumed to exist.
 */
import { CountryPortals } from '../src/types/schemas';
import { dataPath, loadSourceData, today, writeJson } from './lib';
import { PORTAL_URLS } from '../src/features/countries/portals';

const CONCURRENCY = 6;
const { countries } = loadSourceData();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Both sites answer HTTP 200 with a generic page for a code they do not know, so status alone proves
 * nothing. A WTO profile must be a PDF; a real WITS profile is a full page (the generic one is about
 * 98 KB, real ones 135 KB+), so a short body is treated as "no such profile".
 */
const WITS_MIN_BYTES = 115_000;
async function ok(url: string, kind: 'pdf' | 'wits'): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'eport-data-build/1.0 (+https://eport.live)' } });
      if (res.status === 200) {
        if (kind === 'pdf') {
          await res.body?.cancel();
          return (res.headers.get('content-type') ?? '').includes('application/pdf');
        }
        return (await res.text()).length >= WITS_MIN_BYTES;
      }
      await res.body?.cancel();
      if (res.status === 404 || res.status === 410) return false;
    } catch {
      /* retry */
    }
    await sleep(1000 * attempt);
  }
  return false;
}

const out: Record<string, { wits: boolean; wtoProfile: boolean }> = {};
let next = 0;
async function worker() {
  while (next < countries.length) {
    const c = countries[next++]!;
    const [wits, wtoProfile] = await Promise.all([ok(PORTAL_URLS.wits(c.cca3), 'wits'), ok(PORTAL_URLS.wtoProfile(c.cca2), 'pdf')]);
    if (wits || wtoProfile) out[c.cca2] = { wits, wtoProfile };
    if (next % 25 === 0) console.log(`  checked ${next}/${countries.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const file = CountryPortals.parse({ checkedOn: today(), countries: Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))) });
writeJson(dataPath('countries/portals.json'), file);
const n = Object.keys(file.countries).length;
console.log(`Portals: ${n} countries with at least one verified page (${Object.values(file.countries).filter((c) => c.wits).length} WITS, ${Object.values(file.countries).filter((c) => c.wtoProfile).length} WTO profiles).`);
