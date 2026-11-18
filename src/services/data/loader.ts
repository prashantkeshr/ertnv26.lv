/**
 * The one way the app reads published data.
 *
 * Every dataset is a static JSON file under /data, fetched on demand (never bundled into
 * the JavaScript), validated against its Zod schema, and cached in memory for the session.
 * A file that fails validation is treated as an error — eport shows nothing rather than
 * showing data it cannot vouch for.
 */
import { z } from 'zod';
import {
  ApiProvider,
  Authority,
  Country,
  CountryCoverage,
  CountryGuide,
  FeaturedCountries,
  GraphFile,
  IndicatorFile,
  IndicatorIndex,
  LinkStatus,
  Manifest,
  NewsFile,
  Organization,
  RegionTradeFile,
  SearchIndexFile,
  Source,
  TradePartnersFile,
  TradePartnersIndex,
  VideosFile,
  GlobalGuide,
  IncotermsFile,
  DocumentsFile,
  GlossaryFile,
  CountryPortals,
} from '@/types/schemas';

export const DATASETS = {
  manifest: { path: 'manifest.json', schema: Manifest },
  countries: { path: 'countries/index.json', schema: z.array(Country) },
  coverage: { path: 'countries/coverage.json', schema: CountryCoverage },
  organizations: { path: 'organizations/index.json', schema: z.array(Organization) },
  'authorities-in': { path: 'authorities/in.json', schema: z.array(Authority) },
  sources: { path: 'sources/sources.json', schema: z.array(Source) },
  'api-providers': { path: 'sources/api-providers.json', schema: z.array(ApiProvider) },
  'link-status': { path: 'sources/link-status.json', schema: LinkStatus },
  graph: { path: 'graph/index.json', schema: GraphFile },
  search: { path: 'search/index.json', schema: SearchIndexFile },
  news: { path: 'news/latest.json', schema: NewsFile },
  featured: { path: 'countries/featured.json', schema: FeaturedCountries },
  guides: { path: 'countries/guides.json', schema: z.array(CountryGuide) },
  videos: { path: 'videos/index.json', schema: VideosFile },
  'global-guide': { path: 'guides/global.json', schema: GlobalGuide },
  portals: { path: 'countries/portals.json', schema: CountryPortals },
  incoterms: { path: 'learning/incoterms.json', schema: IncotermsFile },
  documents: { path: 'learning/documents.json', schema: DocumentsFile },
  glossary: { path: 'learning/glossary.json', schema: GlossaryFile },
  'trade-regions': { path: 'trade/regions.json', schema: RegionTradeFile },
  'trade-index': { path: 'trade/partners/index.json', schema: TradePartnersIndex },
  'indicator-index': { path: 'trade/indicators/index.json', schema: IndicatorIndex },
} as const;

export type DatasetKey = keyof typeof DATASETS;
export type DatasetOf<K extends DatasetKey> = z.infer<(typeof DATASETS)[K]['schema']>;

export class DataError extends Error {
  constructor(
    public readonly kind: 'network' | 'not-found' | 'http' | 'schema',
    message: string,
  ) {
    super(message);
    this.name = 'DataError';
  }
}

const cache = new Map<string, Promise<unknown>>();

export function dataUrl(path: string): string {
  return `${import.meta.env.BASE_URL}data/${path}`;
}

/** Fetch + validate any data file. Failed loads are evicted so a retry can succeed. */
export function loadFile<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as Promise<T>;
  const promise = (async () => {
    let response: Response;
    try {
      response = await fetch(dataUrl(path), { headers: { Accept: 'application/json' } });
    } catch {
      throw new DataError('network', `Could not reach ${path}`);
    }
    if (response.status === 404) throw new DataError('not-found', `${path} is not published`);
    if (!response.ok) throw new DataError('http', `${path} returned HTTP ${response.status}`);
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new DataError('schema', `${path} is not valid JSON`);
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new DataError('schema', `${path} failed schema validation`);
    return parsed.data;
  })();
  cache.set(path, promise);
  promise.catch(() => cache.delete(path));
  return promise;
}

export function loadDataset<K extends DatasetKey>(key: K): Promise<DatasetOf<K>> {
  const def = DATASETS[key];
  return loadFile(def.path, def.schema as unknown as z.ZodType<DatasetOf<K>>);
}

/** Per-economy indicator file; the caller checks the index first so missing areas are never requested. */
export function loadIndicators(areaCode: string) {
  return loadFile(`trade/indicators/${areaCode}.json`, IndicatorFile);
}

/** One reporter's partners and sectors. Check the index first so missing reporters are never requested. */
export function loadPartners(iso3: string) {
  return loadFile(`trade/partners/${iso3}.json`, TradePartnersFile);
}

export function clearDataCache(): void {
  cache.clear();
}
