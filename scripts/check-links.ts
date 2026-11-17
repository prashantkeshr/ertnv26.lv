/**
 * Checks that every official link published on eport is reachable and records the
 * result in public/data/sources/link-status.json (shown in the Data Reliability Centre).
 *
 *   npm run data:links            — check and write the status file
 *   npm run data:links -- --apply — also stamp verification.lastChecked on records whose
 *                                   official website responded, and flag the rest for review
 *
 * A reachable link confirms the source exists. It does NOT confirm that eport's summary
 * matches the source — that is an editorial review ("officially-verified").
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { devNull } from 'node:os';
import { dataPath, loadSourceData, today, writeJson } from './lib';

const APPLY = process.argv.includes('--apply');
const TIMEOUT_MS = 25_000;
const data = loadSourceData();

const urls = new Set<string>();
for (const s of data.sources) urls.add(s.url);
for (const o of data.organizations) urls.add(o.website);
for (const a of data.authorities) urls.add(a.website);
for (const p of data.providers) urls.add(p.docsUrl);

type Result = { ok: boolean; httpStatus: number | null; detail?: string };

async function check(url: string): Promise<Result> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; eport-link-check/1.0)',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
      });
      await res.body?.cancel();
      // 401/403 mean the server is there but refuses automated clients; a person can still open it.
      if (res.ok) return { ok: true, httpStatus: res.status };
      if (res.status === 401 || res.status === 403)
        return { ok: true, httpStatus: res.status, detail: 'Reachable; refuses automated requests' };
      if (attempt === 1) return { ok: false, httpStatus: res.status };
    } catch (e) {
      if (attempt === 1) return viaCurl(url, e instanceof Error ? e.name : 'error');
    }
  }
  return { ok: false, httpStatus: null };
}

/** Some government servers negotiate TLS that Node's fetch rejects but ordinary clients accept. */
function viaCurl(url: string, fetchError: string): Result {
  try {
    const out = execFileSync('curl', ['-s', '-L', '-m', '25', '-o', devNull, '-w', '%{http_code}', '-A', 'Mozilla/5.0 (compatible; eport-link-check/1.0)', url], { encoding: 'utf8' });
    const status = Number(out.trim());
    if (status >= 200 && status < 400) return { ok: true, httpStatus: status };
    if (status === 401 || status === 403) return { ok: true, httpStatus: status, detail: 'Reachable; refuses automated requests' };
    return { ok: false, httpStatus: status || null, detail: fetchError };
  } catch {
    return { ok: false, httpStatus: null, detail: fetchError };
  }
}

const list = [...urls].sort();
const results: Record<string, Result> = {};
let cursor = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (cursor < list.length) {
      const url = list[cursor++]!;
      results[url] = await check(url);
      const r = results[url]!;
      console.log(`${r.ok ? '✓' : '✗'} ${r.httpStatus ?? '---'} ${url}${r.detail ? ` (${r.detail})` : ''}`);
    }
  }),
);

writeJson('sources/link-status.json', { checkedAt: new Date().toISOString(), results }, true);
const failed = list.filter((u) => !results[u]!.ok);
console.log(`\n${list.length - failed.length}/${list.length} links reachable.`);

if (APPLY) {
  const date = today();
  for (const file of ['organizations/index.json', 'authorities/in.json']) {
    const records = JSON.parse(readFileSync(dataPath(file), 'utf8')) as Array<{
      website: string;
      verification: { status: string; lastChecked: string | null; method: string; note?: string };
    }>;
    for (const r of records) {
      // Never downgrade or overwrite an editorial review.
      if (r.verification.method === 'editorial-review') continue;
      r.verification = results[r.website]?.ok
        ? { status: 'source-referenced', lastChecked: date, method: 'automated-link-check' }
        : {
            status: 'needs-review',
            lastChecked: r.verification.lastChecked,
            method: r.verification.lastChecked ? 'automated-link-check' : 'none',
            note: `Official website did not respond to an automated check on ${date}.`,
          };
    }
    writeFileSync(dataPath(file), JSON.stringify(records, null, 2) + '\n');
  }
  console.log('Applied link-check results to organization and authority records.');
}

// Unreachable links are reported, not fatal: official sites are sometimes down or block bots.
process.exit(0);
