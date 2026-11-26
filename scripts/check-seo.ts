/**
 * SEO guard-rails. Fails the build when a page would be invisible, duplicated or contradictory
 * to a search engine.
 *
 *   tsx scripts/check-seo.ts                              checks dist/ (end of `npm run build`)
 *   tsx scripts/check-seo.ts --live https://eport.live    checks the deployed site instead
 *
 * dist checks, for every page: its own file, exactly one <title> and canonical, the right robots
 * directive, valid JSON-LD, a social image that exists, and (indexable pages) a pre-rendered
 * snapshot with a heading and real text. Across pages: unique titles, a sitemap that lists exactly
 * the indexable pages with sane dates, robots.txt pointing at it, a noindex 404 page.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SITE } from '../src/app/route-meta';
import { ROOT } from './lib';
import { buildPages } from './seo-pages';

const DIST = resolve(ROOT, 'dist');
const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const canonical = (path: string) => SITE.origin + (path === '/' ? '/' : `${path}/`);
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const all = (html: string, re: RegExp) => [...html.matchAll(re)].map((m) => m[1] ?? '');
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Expectation {
  title: string;
  canonical: string | null;
  indexable: boolean;
  og?: string;
}

function checkHtml(label: string, html: string, expect: Expectation, requireSnapshot: boolean): void {
  const titles = all(html, /<title>([\s\S]*?)<\/title>/g);
  if (titles.length !== 1) fail(`${label}: expected one <title>, found ${titles.length}`);
  else if (!titles[0]!.startsWith(escAttr(expect.title).slice(0, 20))) fail(`${label}: title "${titles[0]}" does not match "${expect.title}"`);

  const canon = all(html, /<link rel="canonical" href="([^"]*)"/g);
  if (expect.canonical === null ? canon.length !== 0 : canon.length !== 1 || canon[0] !== expect.canonical) fail(`${label}: canonical is ${JSON.stringify(canon)}, expected ${expect.canonical}`);

  const robots = all(html, /<meta name="robots" content="([^"]*)"/g);
  if (robots.length !== 1) fail(`${label}: expected one robots meta, found ${robots.length}`);
  else if (robots[0]!.includes('noindex') === expect.indexable) fail(`${label}: robots "${robots[0]}" contradicts indexable=${expect.indexable}`);

  if (all(html, /<meta name="description" content="([^"]*)"/g).length !== 1) fail(`${label}: expected one meta description`);
  for (const block of all(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(block);
    } catch {
      fail(`${label}: invalid JSON-LD`);
    }
  }
  if (expect.og && !existsSync(resolve(DIST, expect.og.replace(/^\//, '')))) fail(`${label}: social image ${expect.og} is missing`);

  if (requireSnapshot) {
    const m = html.match(/<div id="snapshot"[^>]*>([\s\S]*?)<\/div>\s*<noscript>/);
    if (!m) fail(`${label}: no pre-rendered snapshot`);
    else {
      if (!/<h1[\s>]/.test(m[1]!)) fail(`${label}: snapshot has no <h1>`);
      if (strip(m[1]!).length < 300) fail(`${label}: snapshot has under 300 characters of text`);
    }
  }
}

function checkDist(): void {
  const pages = buildPages();
  const titles = new Map<string, string>();
  for (const p of pages) {
    const file = p.path === '/' ? resolve(DIST, 'index.html') : resolve(DIST, `.${p.path}`, 'index.html');
    if (!existsSync(file)) {
      fail(`${p.path}: no static page was written (it would answer 404)`);
      continue;
    }
    const html = readFileSync(file, 'utf8');
    checkHtml(p.path, html, { title: p.title, canonical: canonical(p.path), indexable: p.indexable, og: p.og }, p.indexable && !process.env.EPORT_SKIP_SNAPSHOT_CHECK);
    if (p.indexable) {
      const prev = titles.get(p.title);
      if (prev) fail(`${p.path}: same title as ${prev} ("${p.title}")`);
      titles.set(p.title, p.path);
    }
  }
  const descriptions = new Map<string, string>();
  for (const p of pages.filter((x) => x.indexable)) {
    const prev = descriptions.get(p.description);
    if (prev) warnings.push(`${p.path}: same description as ${prev}`);
    descriptions.set(p.description, p.path);
  }

  const notFound = readFileSync(resolve(DIST, '404.html'), 'utf8');
  if (!/<meta name="robots" content="noindex/.test(notFound)) fail('404.html must be noindex');

  const sitemap = readFileSync(resolve(DIST, 'sitemap.xml'), 'utf8');
  const entries = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)];
  const want = new Set(pages.filter((p) => p.indexable).map((p) => canonical(p.path)));
  const got = new Set(entries.map((m) => m[1]!));
  for (const u of want) if (!got.has(u)) fail(`sitemap is missing ${u}`);
  for (const u of got) if (!want.has(u)) fail(`sitemap lists ${u}, which is not an indexable page`);
  if (got.size !== entries.length) fail('sitemap contains duplicate URLs');
  const today = new Date().toISOString().slice(0, 10);
  for (const m of entries) if (m[2] && (!/^\d{4}-\d{2}-\d{2}$/.test(m[2]) || m[2] > today)) fail(`sitemap: bad lastmod ${m[2]} for ${m[1]}`);
  const dated = new Set(entries.map((m) => m[2]).filter(Boolean));
  if (entries.length > 20 && dated.size < 2) warnings.push('sitemap: every lastmod is identical — search engines learn to ignore that');

  const robots = readFileSync(resolve(ROOT, 'public/robots.txt'), 'utf8');
  if (!robots.includes(`Sitemap: ${SITE.origin}/sitemap.xml`)) fail('robots.txt does not point at the sitemap');
  console.log(`SEO check (dist): ${pages.length} pages, ${want.size} in the sitemap, ${pages.length - want.size} noindex.`);
}

async function checkLive(origin: string): Promise<void> {
  const get = async (url: string) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'eport-seo-check/1.0' }, signal: AbortSignal.timeout(30_000) });
        return { status: res.status, text: await res.text() };
      } catch {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    return { status: 0, text: '' };
  };
  const sm = await get(`${origin}/sitemap.xml`);
  if (sm.status !== 200) {
    fail(`sitemap.xml answered ${sm.status}`);
    return;
  }
  const urls = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.replace(SITE.origin, origin));
  if (urls.length < 100) fail(`live sitemap lists only ${urls.length} URLs`);
  let next = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (next < urls.length) {
        const u = urls[next++]!;
        const r = await get(u);
        if (r.status !== 200) {
          fail(`${u} answered ${r.status}`);
          continue;
        }
        if (!/<h1[\s>]/.test(r.text)) fail(`${u}: no <h1> in the served HTML`);
        if (!r.text.includes(`<link rel="canonical" href="${u.replace(origin, SITE.origin)}"`)) fail(`${u}: wrong or missing canonical`);
        if (/<meta name="robots" content="noindex/.test(r.text)) fail(`${u}: is in the sitemap but marked noindex`);
      }
    }),
  );
  const nf = await get(`${origin}/this-page-does-not-exist-eport-check/`);
  if (nf.status !== 404) fail(`an unknown URL answered ${nf.status}, expected 404`);
  console.log(`SEO check (live ${origin}): ${urls.length} sitemap URLs fetched.`);
}

const liveAt = process.argv.indexOf('--live');
if (liveAt > 0) await checkLive(process.argv[liveAt + 1] ?? SITE.origin);
else checkDist();

for (const w of warnings.slice(0, 10)) console.warn(`  ! ${w}`);
if (errors.length) {
  console.error(`SEO check failed with ${errors.length} problem(s):`);
  for (const e of errors.slice(0, 40)) console.error(`  ✗ ${e}`);
  process.exit(1);
}
