/**
 * The single list of pages eport publishes to search engines, with everything a crawler needs:
 * title, description, canonical path, whether it may be indexed, an honest last-modified date
 * (taken from the data behind the page, never the build date), breadcrumbs and structured data.
 *
 * Used by generate-static (page shells + sitemap), prerender (which pages to render) and
 * check-seo (which pages must pass). Node-only.
 */
import { existsSync, readFileSync } from 'node:fs';
import { ROUTES, SITE, type RouteMeta } from '../src/app/route-meta';
import { countryDescription, countryTitle } from '../src/app/seo-text';
import { COMPANY } from '../src/app/company';
import { dataPath, loadSourceData } from './lib';

export type PageKind = 'home' | 'section' | 'country' | 'region' | 'organization' | 'authority' | 'learning' | 'tool' | 'info';

export interface SeoPage extends RouteMeta {
  kind: PageKind;
  /** Short label used in breadcrumbs. */
  crumb: string;
  /** ISO date of the data behind the page; omitted when nothing dated backs it. */
  lastmod?: string;
  jsonLd: object[];
  /** Social-preview image path, e.g. /og/countries-DE.jpg. */
  og: string;
  /** Small heading on the social card. */
  kicker: string;
  /** ISO 3166-1 alpha-2 for the flag on a country card. */
  flag?: string;
}

const json = <T>(rel: string): T | null => (existsSync(dataPath(rel)) ? (JSON.parse(readFileSync(dataPath(rel), 'utf8')) as T) : null);
const url = (path: string) => SITE.origin + (path === '/' ? '/' : `${path}/`);
export const ogPathFor = (path: string) => `/og/${path === '/' ? 'home' : path.slice(1).replace(/\//g, '-')}.jpg`;

const SECTION_CRUMB: Record<string, string> = {
  '/countries': 'Countries',
  '/directory': 'Directory',
  '/directory/organizations': 'International organizations',
  '/directory/authorities': 'Authorities',
  '/intelligence': 'Intelligence',
  '/intelligence/news': 'News',
  '/academy': 'Academy',
  '/academy/videos': 'Videos',
  '/academy/incoterms': 'Incoterms®',
  '/academy/documents': 'Trade documents',
  '/academy/glossary': 'Glossary',
  '/trade': 'Trade Explorer',
  '/connect': 'Connect',
  '/trade-desk': 'Trade Desk',
  '/opportunities': 'Opportunities',
  '/data-reliability': 'Data Reliability Centre',
  '/methodology': 'Methodology',
  '/contact': 'Contact',
  '/about': 'About',
  '/privacy': 'Privacy',
};

function kindOf(path: string): PageKind {
  if (path === '/') return 'home';
  if (path.startsWith('/regions/')) return 'region';
  if (path.startsWith('/academy/') && ['incoterms', 'documents', 'glossary'].some((s) => path.endsWith(s))) return 'learning';
  if (path === '/trade') return 'tool';
  if (['/about', '/privacy', '/methodology', '/contact', '/data-reliability'].includes(path)) return 'info';
  return 'section';
}

export function buildPages(): SeoPage[] {
  const data = loadSourceData();
  const catalogDate = (p: string): string | undefined => data.catalog.find((c) => c.path === p)?.lastUpdated ?? undefined;
  const news = json<{ retrievedOn?: string }>('news/latest.json');
  const videos = json<{ verifiedOn?: string }>('videos/index.json');
  const regions = json<{ retrievedOn?: string }>('trade/regions.json');
  const partnersIndex = json<{ retrievedOn?: string; reporters: string[] }>('trade/partners/index.json');
  const indicatorIndex = json<{ retrievedOn?: string; areas: string[] }>('trade/indicators/index.json');
  const incoterms = json<{ draftedOn?: string }>('learning/incoterms.json');
  const documents = json<{ draftedOn?: string }>('learning/documents.json');
  const glossary = json<{ draftedOn?: string }>('learning/glossary.json');
  const reporters = new Set(partnersIndex?.reporters ?? []);
  const indicatorAreas = new Set(indicatorIndex?.areas ?? []);
  const nameByIso3 = new Map(data.countries.map((c) => [c.cca3, c.name]));

  const staticDates: Record<string, string | undefined> = {
    '/': news?.retrievedOn,
    '/countries': indicatorIndex?.retrievedOn,
    '/directory/organizations': catalogDate('organizations/index.json'),
    '/directory/authorities': catalogDate('authorities/in.json'),
    '/intelligence/news': news?.retrievedOn,
    '/academy/videos': videos?.verifiedOn,
    '/academy/incoterms': incoterms?.draftedOn,
    '/academy/documents': documents?.draftedOn,
    '/academy/glossary': glossary?.draftedOn,
    '/trade': partnersIndex?.retrievedOn,
    '/data-reliability': catalogDate('catalog.json') ?? partnersIndex?.retrievedOn,
  };

  const pages: SeoPage[] = ROUTES.map((r) => {
    const kind = kindOf(r.path);
    const region = r.path.startsWith('/regions/');
    const crumb = region ? `Trade in ${r.path.split('/')[2]![0]!.toUpperCase()}${r.path.split('/')[2]!.slice(1)}` : (SECTION_CRUMB[r.path] ?? r.title.split(' — ')[0]!);
    return {
      ...r,
      kind,
      crumb,
      lastmod: region ? regions?.retrievedOn : staticDates[r.path],
      jsonLd: [],
      og: ogPathFor(r.path),
      kicker: region ? 'Trade by region' : kind === 'learning' ? 'eport Academy' : kind === 'tool' ? 'Trade Explorer' : 'Global trade intelligence',
    };
  });

  for (const o of data.organizations.filter((x) => x.publicationStatus === 'published')) {
    const path = `/directory/organizations/${o.id}`;
    pages.push({
      path,
      title: `${o.name} (${o.abbreviation}) — role in international trade`,
      description: o.summary,
      indexable: true,
      kind: 'organization',
      crumb: o.abbreviation ?? o.name,
      lastmod: catalogDate('organizations/index.json'),
      jsonLd: [{ '@type': 'WebPage', about: { '@type': 'Organization', name: o.name, ...(o.website ? { url: o.website } : {}) } }],
      og: ogPathFor(path),
      kicker: 'International organization',
    });
  }
  for (const a of data.authorities.filter((x) => x.publicationStatus === 'published')) {
    const path = `/directory/authorities/${a.id}`;
    pages.push({
      path,
      title: `${a.name}${a.abbreviation ? ` (${a.abbreviation})` : ''} — role in international trade`,
      description: a.summary,
      indexable: true,
      kind: 'authority',
      crumb: a.abbreviation ?? a.name,
      lastmod: catalogDate('authorities/in.json'),
      jsonLd: [{ '@type': 'WebPage', about: { '@type': 'GovernmentOrganization', name: a.name, ...(a.website ? { url: a.website } : {}) } }],
      og: ogPathFor(path),
      kicker: 'Official trade authority',
    });
  }

  // Every country gets a page that returns 200. Only countries with data behind them are indexable.
  for (const c of data.countries) {
    const path = `/countries/${c.cca2}`;
    const partner = reporters.has(c.cca3) ? json<{ exports: Array<[string, number]>; sectors: { exports: Array<[string, number]> }; retrievedOn?: string }>(`trade/partners/${c.cca3}.json`) : null;
    const hasIndicators = indicatorAreas.has(c.cca3);
    const indicators = hasIndicators ? json<{ retrievedOn?: string }>(`trade/indicators/${c.cca3}.json`) : null;
    const dates = [partner?.retrievedOn, indicators?.retrievedOn].filter((d): d is string => Boolean(d)).sort();
    pages.push({
      path,
      title: countryTitle(c.name),
      description: countryDescription({
        name: c.name,
        cca2: c.cca2,
        cca3: c.cca3,
        topExportMarkets: (partner?.exports ?? []).slice(0, 3).map(([iso3]) => nameByIso3.get(iso3) ?? ''),
        topExportSectors: (partner?.sectors.exports ?? []).map(([id]) => id),
      }),
      indexable: Boolean(partner) || hasIndicators,
      kind: 'country',
      crumb: c.name,
      lastmod: dates[dates.length - 1],
      jsonLd: [{ '@type': 'WebPage', about: { '@type': 'Country', name: c.name } }],
      og: ogPathFor(path),
      kicker: c.region ? `${c.region} · trade profile` : 'Trade profile',
      flag: c.cca2,
    });
  }

  // Structured data shared by every page: WebPage identity, breadcrumbs, and per-kind extras.
  const byPath = new Map(pages.map((p) => [p.path, p]));
  for (const p of pages) {
    const base = {
      '@type': p.kind === 'learning' ? 'Article' : 'WebPage',
      '@id': `${url(p.path)}#webpage`,
      url: url(p.path),
      name: p.title,
      description: p.description,
      inLanguage: 'en',
      isPartOf: { '@id': `${SITE.origin}/#website` },
      ...(p.lastmod ? { dateModified: p.lastmod } : {}),
      ...(p.kind === 'learning' ? { headline: p.title, author: { '@id': `${SITE.origin}/#organization` }, publisher: { '@id': `${SITE.origin}/#organization` }, image: SITE.origin + p.og } : {}),
    };
    const extra = (p.jsonLd[0] ?? {}) as Record<string, unknown>;
    const nodes: object[] = [{ ...base, ...extra, '@type': base['@type'] }];

    if (p.path !== '/') {
      const parts = p.path.split('/').filter(Boolean);
      const trail = [{ name: 'Home', item: url('/') }];
      for (let i = 1; i <= parts.length; i++) {
        const sub = '/' + parts.slice(0, i).join('/');
        const page = byPath.get(sub);
        if (page) trail.push({ name: page.crumb, item: url(sub) });
        else if (sub === '/regions') trail.push({ name: 'Countries', item: url('/countries') });
      }
      nodes.push({ '@type': 'BreadcrumbList', itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.item })) });
    } else {
      nodes.push(
        { '@type': 'WebSite', '@id': `${SITE.origin}/#website`, url: url('/'), name: SITE.name, description: SITE.description, inLanguage: 'en', publisher: { '@id': `${SITE.origin}/#organization` } },
        {
          '@type': 'Organization',
          '@id': `${SITE.origin}/#organization`,
          name: SITE.name,
          url: url('/'),
          description: 'Independent global trade and maritime information platform, a subsidiary of Dhurta.org and managed by Dhurta Group.',
          email: COMPANY.supportEmail,
          parentOrganization: { '@type': 'Organization', name: 'Dhurta.org', url: COMPANY.parent.url },
          contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: COMPANY.supportEmail },
        },
      );
    }
    p.jsonLd = nodes;
  }
  // Pages kept out of search get no card of their own; they share the default one.
  for (const p of pages) if (!p.indexable) p.og = '/og/default.jpg';
  return pages;
}
