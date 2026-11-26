/**
 * Pre-renders every indexable page into its static HTML, and draws a social-preview image for each.
 *
 *   node: tsx scripts/prerender.ts     (runs after vite build + generate-static)
 *
 * Why: eport is a single-page app, so the HTML a server sends is an empty shell. Search engines
 * that do not run JavaScript — and AI crawlers, which mostly do not — would see nothing. This
 * script opens each page in a real browser, waits for it to finish loading, and saves the rendered
 * content into the page's HTML as a snapshot. In a browser the app then takes over (src/main.tsx
 * removes the snapshot once the live page is ready), so people and crawlers get the same content.
 *
 *   EPORT_E2E_CHANNEL=msedge   use an installed browser (local); CI installs Playwright's chromium
 *   EPORT_PRERENDER_ONLY=/x    render only paths starting with /x (for quick local checks)
 *   EPORT_SKIP_OG=1            skip the social-preview images
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve } from 'node:path';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { SITE } from '../src/app/route-meta';
import { ROOT } from './lib';
import { buildPages, type SeoPage } from './seo-pages';

const DIST = resolve(ROOT, 'dist');
const CONCURRENCY = 4;
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.gif': 'image/gif', '.txt': 'text/plain' };

/* ---------- social-preview card ---------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fontFile = (family: string) => readdirSync(join(DIST, 'assets')).find((f) => f.startsWith(`${family}-latin-wght-normal`) && f.endsWith('.woff2'));

function cardHtml(q: URLSearchParams): string {
  const title = q.get('t') ?? '';
  const sub = q.get('s') ?? '';
  const kicker = q.get('k') ?? '';
  const flag = q.get('f');
  const flagFile = flag ? resolve(ROOT, 'node_modules/flag-icons/flags/4x3', `${flag.toLowerCase()}.svg`) : null;
  const flagUri = flagFile && existsSync(flagFile) ? `data:image/svg+xml;base64,${readFileSync(flagFile).toString('base64')}` : null;
  const manrope = fontFile('manrope');
  const inter = fontFile('inter');
  const size = title.length > 46 ? 56 : title.length > 28 ? 68 : 84;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${manrope ? `@font-face{font-family:M;src:url(/assets/${manrope});font-weight:200 800}` : ''}
${inter ? `@font-face{font-family:I;src:url(/assets/${inter});font-weight:100 900}` : ''}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;color:#fff;font-family:I,system-ui,sans-serif;
background:radial-gradient(900px 500px at 85% 10%,rgba(56,189,248,.28),transparent 60%),linear-gradient(135deg,#0b1f33 0%,#0e3a5f 100%);position:relative}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:60px 60px}
.wrap{position:relative;height:100%;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:16px;font:800 36px M,sans-serif;letter-spacing:-.01em}
.globe{width:44px;height:44px;border:3px solid #7dd3fc;border-radius:50%;position:relative}
.globe:before,.globe:after{content:"";position:absolute;border:3px solid #7dd3fc;border-radius:50%;inset:0 10px}
.globe:after{inset:10px 0;border-radius:50%/50%}
.kicker{font:700 24px I,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7dd3fc}
h1{font:800 ${size}px/1.08 M,sans-serif;letter-spacing:-.02em;margin-top:18px;max-width:${flagUri ? 820 : 1000}px}
.sub{font:400 30px/1.4 I,sans-serif;color:rgba(255,255,255,.82);margin-top:22px;max-width:900px}
.foot{display:flex;justify-content:space-between;align-items:center;font:600 24px I,sans-serif;color:rgba(255,255,255,.7)}
.flag{position:absolute;right:72px;top:200px;width:240px;height:180px;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.45);outline:2px solid rgba(255,255,255,.25)}
</style></head><body><div class="grid"></div>${flagUri ? `<img class="flag" src="${flagUri}" alt="">` : ''}
<div class="wrap"><div class="brand"><span class="globe"></span>eport</div>
<div><div class="kicker">${esc(kicker)}</div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>
<div class="foot"><span>eport.live</span><span>Global Trade &amp; Maritime Intelligence</span></div></div></body></html>`;
}

function cardText(p: SeoPage): { t: string; s: string } {
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  if (p.kind === 'home') return { t: 'Connecting Global Trade. Simplifying International Commerce.', s: '' };
  if (p.kind === 'country') return { t: p.crumb, s: 'Trade partners, indicators and an import–export guide' };
  if (p.kind === 'region') return { t: p.crumb, s: 'Economies, trade lanes and countries' };
  return { t: p.title.split(' — ')[0]!.replace(/ \| eport$/, ''), s: clip(p.description, 120) };
}

/* ---------- static server over dist/ ---------- */

function serve(): Promise<{ origin: string; close: () => void }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname === '/__og') {
      res.writeHead(200, { 'content-type': MIME['.html']! });
      res.end(cardHtml(url.searchParams));
      return;
    }
    const clean = decodeURIComponent(url.pathname);
    const candidates = extname(clean) ? [clean] : [join(clean, 'index.html')];
    for (const c of candidates) {
      const file = join(DIST, c);
      if (file.startsWith(DIST) && existsSync(file) && !readdirOrNull(file)) {
        res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
        res.end(readFileSync(file));
        return;
      }
    }
    res.writeHead(404, { 'content-type': MIME['.html']! });
    res.end(readFileSync(join(DIST, '404.html')));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() })));
}
function readdirOrNull(p: string) {
  try {
    return readdirSync(p);
  } catch {
    return null;
  }
}

/* ---------- snapshot extraction ---------- */

/** Runs in the page: the rendered app, without things that only matter to a live page. */
function extractSnapshot(): { html: string; textLength: number } {
  const root = document.getElementById('root')!;
  const clone = root.cloneNode(true) as HTMLElement;
  // Big decorative graphics (map outlines) bloat the file and mean nothing as text.
  clone.querySelectorAll('svg').forEach((svg) => {
    if (svg.outerHTML.length > 3000) svg.remove();
  });
  clone.querySelectorAll('script, style, noscript, dialog').forEach((n) => n.remove());
  // The live app owns every id; duplicates in a snapshot would confuse anchors and tests.
  clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  clone.querySelectorAll('[autofocus]').forEach((n) => n.removeAttribute('autofocus'));
  return { html: clone.innerHTML, textLength: root.innerText.length };
}

async function renderOne(context: BrowserContext, origin: string, page: SeoPage): Promise<void> {
  const tab = await context.newPage();
  try {
    await tab.goto(`${origin}${page.path === '/' ? '/' : `${page.path}/`}`, { waitUntil: 'domcontentloaded' });
    await tab.waitForSelector('#root main h1', { timeout: 30_000 });
    await tab.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined);
    await tab.waitForTimeout(250);
    const { html, textLength } = await tab.evaluate(extractSnapshot);
    if (textLength < 300) throw new Error(`only ${textLength} characters of text rendered`);
    const file = page.path === '/' ? join(DIST, 'index.html') : join(DIST, `.${page.path}`, 'index.html');
    const doc = readFileSync(file, 'utf8');
    if (!doc.includes('<div id="root"></div>')) throw new Error('page shell has no empty #root to attach the snapshot to');
    writeFileSync(file, doc.replace('<div id="root"></div>', `<div id="root"></div>\n    <div id="snapshot" data-snapshot aria-hidden="true">${html}</div>`));
  } finally {
    await tab.close();
  }
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) await fn(items[next++]!);
    }),
  );
}

async function main() {
  const only = process.env.EPORT_PRERENDER_ONLY;
  const pages = buildPages().filter((p) => p.indexable && (!only || p.path.startsWith(only)));
  const { origin, close } = await serve();
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ channel: process.env.EPORT_E2E_CHANNEL || undefined });
  } catch (e) {
    close();
    throw new Error(`Could not start a browser for pre-rendering (${e instanceof Error ? e.message.split('\n')[0] : e}). Locally set EPORT_E2E_CHANNEL=msedge (or chrome); in CI run "npx playwright install --with-deps chromium".`);
  }
  // Reduced motion: every reveal-on-scroll element is rendered in its final, visible state.
  const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'light', viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const failures: string[] = [];
  let done = 0;
  const started = Date.now();

  await pool(pages, CONCURRENCY, async (page) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await renderOne(context, origin, page);
        break;
      } catch (e) {
        if (attempt === 2) failures.push(`${page.path}: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
      }
    }
    if (++done % 50 === 0) console.log(`  rendered ${done}/${pages.length}`);
  });

  if (!process.env.EPORT_SKIP_OG) {
    const ogContext = await browser.newContext({ viewport: { width: 1200, height: 630 } });
    mkdirSync(join(DIST, 'og'), { recursive: true });
    await pool(pages, CONCURRENCY, async (p) => {
      const tab = await ogContext.newPage();
      try {
        const { t, s } = cardText(p);
        const q = new URLSearchParams({ t, s, k: p.kicker, ...(p.flag ? { f: p.flag } : {}) });
        await tab.goto(`${origin}/__og?${q}`, { waitUntil: 'load' });
        await tab.evaluate(() => document.fonts.ready);
        const file = join(DIST, p.og.replace(/^\//, ''));
        mkdirSync(join(file, '..'), { recursive: true });
        writeFileSync(file, await tab.screenshot({ type: 'jpeg', quality: 82 }));
      } catch (e) {
        failures.push(`og ${p.path}: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
      } finally {
        await tab.close();
      }
    });
    // The 404 page and any non-indexable page that points at the default card.
    const home = pages.find((p) => p.path === '/');
    if (home) writeFileSync(join(DIST, 'og', 'default.jpg'), readFileSync(join(DIST, home.og.replace(/^\//, ''))));
  }

  await browser.close();
  close();
  const secs = Math.round((Date.now() - started) / 1000);
  if (failures.length) {
    console.error(`Pre-render failed for ${failures.length} item(s):\n  ✗ ${failures.slice(0, 20).join('\n  ✗ ')}`);
    process.exit(1);
  }
  console.log(`Pre-rendered ${pages.length} pages${process.env.EPORT_SKIP_OG ? '' : ' and their social cards'} for ${SITE.origin} in ${secs}s.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
