/**
 * Post-build step for GitHub Pages (runs after `vite build`).
 *
 * 1. Writes dist/<route>/index.html for every real page, each with its own <title>,
 *    description, canonical URL and Open Graph tags. Direct links and refreshes then return
 *    HTTP 200 with correct metadata instead of relying on the 404 fallback.
 * 2. Writes dist/404.html (the SPA shell) so any other deep link still boots the app.
 * 3. Writes dist/sitemap.xml listing only pages with substantive content.
 *
 * Only pages backed by published records are generated — no empty country or product pages.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ROUTES, SITE, type RouteMeta } from '../src/app/route-meta';
import { loadSourceData, ROOT, today } from './lib';

const DIST = resolve(ROOT, 'dist');
const shell = readFileSync(resolve(DIST, 'index.html'), 'utf8');
const data = loadSourceData();

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s: string, n = 300) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const fullTitle = (t: string) => (t.includes(SITE.name) ? t : `${t} | ${SITE.name}`);
const canonical = (path: string) => SITE.origin + (path === '/' ? '/' : `${path}/`);

function render(meta: RouteMeta): string {
  const title = esc(fullTitle(meta.title));
  const description = esc(clip(meta.description));
  const url = canonical(meta.path);
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  if (!meta.indexable) html = html.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>');
  return html;
}

// Static routes, plus one page per published record that has real content.
const pages: RouteMeta[] = [...ROUTES];
for (const o of data.organizations.filter((r) => r.publicationStatus === 'published')) {
  pages.push({ path: `/directory/organizations/${o.id}`, title: `${o.name} (${o.abbreviation}) — role in international trade`, description: o.summary, indexable: true });
}
for (const a of data.authorities.filter((r) => r.publicationStatus === 'published')) {
  pages.push({
    path: `/directory/authorities/${a.id}`,
    title: `${a.name}${a.abbreviation ? ` (${a.abbreviation})` : ''} — role in international trade`,
    description: a.summary,
    indexable: true,
  });
}
// Country pages are pre-generated only where eport publishes more than a reference record.
for (const code of Object.keys(data.coverage.countries)) {
  const c = data.countries.find((x) => x.cca2 === code)!;
  pages.push({
    path: `/countries/${code}`,
    title: `${c.name} — trade profile, indicators and authorities`,
    description: `${c.name} (${c.cca2}, ${c.cca3}): ISO identifiers, World Bank trade and economic indicators, reference exchange rate and linked trade authorities.`,
    indexable: true,
  });
}

for (const page of pages) {
  if (page.path === '/') {
    writeFileSync(resolve(DIST, 'index.html'), render(page));
    continue;
  }
  const file = resolve(DIST, `.${page.path}`, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(page));
}

writeFileSync(
  resolve(DIST, '404.html'),
  render({ path: '/404', title: 'Page not found', description: 'This page does not exist on eport.', indexable: false }).replace(/\s*<link rel="canonical"[^>]*>/, ''),
);

const lastmod = today();
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages
    .filter((p) => p.indexable)
    .map((p) => `  <url><loc>${canonical(p.path)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n') +
  `\n</urlset>\n`;
writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap);

console.log(`Static generation: ${pages.length} route shells, 404.html, sitemap.xml (${pages.filter((p) => p.indexable).length} URLs).`);
