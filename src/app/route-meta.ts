/**
 * Titles and descriptions for every static route. Used at runtime (useSeo) and at build
 * time (scripts/generate-static.ts) so each route ships its own HTML shell and sitemap entry.
 * Node-safe: no React imports.
 */
import { DIVISIONS } from './modules';

export const SITE = {
  name: 'eport',
  origin: 'https://eport.live',
  tagline: 'Connecting Global Trade. Simplifying International Commerce.',
  positioning: 'Global Trade & Maritime Intelligence',
  description:
    'eport is an independent platform for international trade information, export-import education, maritime intelligence and trade documentation.',
} as const;

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  /** Listed in sitemap.xml. Thin pages stay out. */
  indexable: boolean;
}

export const ROUTES: RouteMeta[] = [
  { path: '/', title: 'eport — Global Trade & Maritime Intelligence', description: SITE.description, indexable: true },
  { path: '/countries', title: 'Country Explorer — every country and territory', description: 'Browse every country and territory with ISO codes, region, currency, sourced trade indicators and linked trade authorities.', indexable: true },
  { path: '/directory/organizations', title: 'International trade organizations', description: 'The intergovernmental, UN-system, treaty and private organizations that shape international trade and shipping rules, with official links.', indexable: true },
  { path: '/directory/authorities', title: 'Government and official trade authorities', description: 'Trade, customs, tax, standards and sector regulators with their official websites. India is the first jurisdiction covered.', indexable: true },
  { path: '/intelligence/news', title: 'Trade and maritime news', description: 'Headlines from the WTO, ITC, European Commission, ICC and UN News, refreshed daily, plus a live web headline search. Every item links to the original article.', indexable: true },
  { path: '/academy/videos', title: 'Official explainer videos', description: 'Explainer videos from the WTO, World Customs Organization, ITC, IMO and ICC, from the organizations’ own channels. Nothing loads from YouTube until you press play.', indexable: true },
  { path: '/trade', title: 'Trade Explorer — goods trade between any two countries', description: 'Pick any two countries and see goods trade between them in both directions, from each side’s own report, with the gaps explained. Worldwide data from the World Bank WITS.', indexable: true },
  { path: '/search', title: 'Search eport', description: 'Search countries, authorities, organizations and tools across eport.', indexable: false },
  { path: '/data-reliability', title: 'Data Reliability Centre', description: 'Which eport datasets, countries, APIs and authorities are verified, partially covered, seeded or unavailable — and when each was last checked.', indexable: true },
  { path: '/methodology', title: 'Sources and methodology', description: 'How eport selects sources, labels verification and requirement status, and reviews regulatory content.', indexable: true },
  { path: '/contact', title: 'Contact eport', description: 'Contact the eport team at support@dhurta.org to report an error, suggest an official source or discuss a partnership. eport is a subsidiary of Dhurta.org, managed by Dhurta Group.', indexable: true },
  { path: '/about', title: 'About eport', description: 'eport is an independent trade and maritime information platform. It is not a government, customs, port or regulatory service.', indexable: true },
  { path: '/privacy', title: 'Privacy and local data', description: 'eport has no accounts and no server. What is stored in your browser, and which external services receive requests.', indexable: true },
  ...['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].map((r) => ({
    path: `/regions/${r.toLowerCase()}`,
    title: `Trade in ${r} — economies, lanes and countries`,
    description: `${r}: its countries, largest economies, where its goods exports go and the largest trade lanes, from World Bank data. Pick any country for its map, partners and authorities.`,
    indexable: true,
  })),
  ...DIVISIONS.map((d) => ({
    path: d.path,
    title: `${d.kicker} — ${d.purpose}`,
    description: d.description,
    indexable: true,
  })),
];

export function routeMeta(path: string): RouteMeta {
  const found = ROUTES.find((r) => r.path === path);
  if (!found) throw new Error(`No route metadata for ${path}`);
  return found;
}
