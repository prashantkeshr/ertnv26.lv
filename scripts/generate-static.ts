/**
 * Post-build step for GitHub Pages (runs after `vite build`).
 *
 * 1. Writes dist/<route>/index.html for every page in scripts/seo-pages.ts — all 250 country pages
 *    included — each with its own <title>, description, canonical URL, robots directive, social
 *    tags and structured data. Direct links then return HTTP 200 instead of the 404 fallback.
 * 2. Writes dist/404.html (the app shell, noindex) so unknown deep links still boot the app.
 * 3. Writes dist/sitemap.xml with every indexable page and the date of the data behind it.
 *
 * scripts/prerender.ts then fills each page with its rendered content.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SEO_VERIFICATION, SITE } from '../src/app/route-meta';
import { ROOT } from './lib';
import { buildPages, type SeoPage } from './seo-pages';

const DIST = resolve(ROOT, 'dist');
const shell = readFileSync(resolve(DIST, 'index.html'), 'utf8');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s: string, n = 300) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
export const fullTitle = (t: string) => (t.includes(SITE.name) ? t : `${t} | ${SITE.name}`);
export const canonical = (path: string) => SITE.origin + (path === '/' ? '/' : `${path}/`);
/** JSON for an inline <script>: "<" is escaped so no data value can close the tag. */
const ldJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

export function renderShell(page: Pick<SeoPage, 'path' | 'title' | 'description' | 'indexable' | 'og' | 'jsonLd'>, base = shell): string {
  const title = esc(fullTitle(page.title));
  const description = esc(clip(page.description));
  const url = canonical(page.path);
  const image = SITE.origin + page.og;
  let html = base
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);

  const head: string[] = [
    `<meta name="robots" content="${page.indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow'}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${title}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ];
  if (SEO_VERIFICATION.google) head.push(`<meta name="google-site-verification" content="${esc(SEO_VERIFICATION.google)}" />`);
  if (SEO_VERIFICATION.bing) head.push(`<meta name="msvalidate.01" content="${esc(SEO_VERIFICATION.bing)}" />`);

  // Breadcrumbs keep the id the running app uses, so it replaces rather than duplicates them.
  const crumbs = page.jsonLd.find((n) => (n as { '@type'?: string })['@type'] === 'BreadcrumbList');
  const graph = page.jsonLd.filter((n) => n !== crumbs);
  if (graph.length) head.push(`<script type="application/ld+json" id="eport-jsonld">${ldJson({ '@context': 'https://schema.org', '@graph': graph })}</script>`);
  if (crumbs) head.push(`<script type="application/ld+json" id="eport-breadcrumbs">${ldJson({ '@context': 'https://schema.org', ...crumbs })}</script>`);

  return html.replace('</head>', `    ${head.join('\n    ')}\n  </head>`);
}

export function writePage(page: SeoPage, html: string): void {
  const file = page.path === '/' ? resolve(DIST, 'index.html') : resolve(DIST, `.${page.path}`, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// Only run when executed directly (prerender and check-seo import the helpers above).
if (process.argv[1] && /generate-static\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const pages = buildPages();
  for (const page of pages) writePage(page, renderShell(page));

  writeFileSync(
    resolve(DIST, '404.html'),
    renderShell({ path: '/404', title: 'Page not found', description: 'This page does not exist on eport.', indexable: false, og: '/og/default.jpg', jsonLd: [] }).replace(/\s*<link rel="canonical"[^>]*>/, ''),
  );

  const indexable = pages.filter((p) => p.indexable);
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    indexable.map((p) => `  <url><loc>${canonical(p.path)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    `\n</urlset>\n`;
  writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap);

  const thin = pages.length - indexable.length;
  console.log(`Static generation: ${pages.length} pages (${indexable.length} indexable, ${thin} noindex), 404.html, sitemap.xml.`);
}
