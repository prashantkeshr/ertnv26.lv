/**
 * Canonical data schemas for every eport dataset.
 *
 * This module is imported by the browser data loader AND by the Node data
 * scripts (validation, index building), so it must stay free of browser or
 * React imports.
 */
import { z } from 'zod';

/* ---------- shared vocabulary ---------- */

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');
export const Iso2 = z.string().regex(/^[A-Z]{2}$/, 'Expected an ISO 3166-1 alpha-2 code');
export const HttpsUrl = z.string().regex(/^https:\/\/[^\s]+$/, 'Expected an https:// URL');

/** Verification of a record against its source. */
export const VerificationStatus = z.enum(['officially-verified', 'source-referenced', 'needs-review', 'outdated']);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

/** Whether a trade requirement applies. "unknown" is never treated as "not required". */
export const RequirementStatus = z.enum(['mandatory', 'conditional', 'optional', 'unknown']);
export type RequirementStatus = z.infer<typeof RequirementStatus>;

export const PublicationStatus = z.enum(['published', 'draft', 'archived']);

export const ENTITY_TYPES = [
  'country',
  'organization',
  'authority',
  'document',
  'port',
  'product',
  'hs-code',
  'agreement',
  'shipping-line',
  'page',
] as const;
export const EntityType = z.enum(ENTITY_TYPES);
export type EntityType = z.infer<typeof EntityType>;

/** A typed reference to any record on the platform, e.g. "country:IN" or "authority:in-dgft". */
export const EntityRef = z.string().regex(/^[a-z-]+:[A-Za-z0-9._-]+$/, 'Expected "<type>:<id>"');
export type EntityRef = z.infer<typeof EntityRef>;

export const Verification = z.object({
  status: VerificationStatus,
  /** Date the official link was last confirmed reachable, or the content last reviewed. Null = never checked. */
  lastChecked: IsoDate.nullable(),
  method: z.enum(['automated-link-check', 'editorial-review', 'none']),
  note: z.string().optional(),
});
export type Verification = z.infer<typeof Verification>;

/** An edge in the Global Trade Knowledge Graph, declared on the record that owns it. */
export const Relation = z.object({
  to: EntityRef,
  type: z.enum([
    'jurisdiction',
    'headquartered-in',
    'parent-body',
    'operated-by',
    'hosted-by',
    'joint-agency-of',
    'works-with',
    'administers',
    'depends-on',
    'issued-by',
    'prepared-by',
    'located-in',
  ]),
  note: z.string().optional(),
});
export type Relation = z.infer<typeof Relation>;

/* ---------- sources ---------- */

/** Ordered by eport's source priority (see DATA_POLICY.md). */
export const SourceType = z.enum([
  'official-government',
  'international-organization',
  'official-operator',
  'statutory-organization',
  'licensed-data-provider',
  'research-organization',
  'secondary-publication',
]);
export type SourceType = z.infer<typeof SourceType>;

export const Source = z.object({
  id: z.string().min(2),
  publisher: z.string(),
  title: z.string(),
  url: HttpsUrl,
  sourceType: SourceType,
  /** ISO 3166-1 alpha-2, or "INT" for international. */
  jurisdiction: z.union([Iso2, z.literal('INT')]),
  license: z.string().optional(),
  attribution: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

/* ---------- countries ---------- */

export const Country = z.object({
  id: Iso2,
  cca2: Iso2,
  cca3: z.string().regex(/^[A-Z]{3}$/),
  /** ISO 3166-1 numeric, zero-padded. Absent for a few user-assigned codes. */
  ccn3: z.string().regex(/^\d{3}$/).nullable(),
  name: z.string(),
  officialName: z.string(),
  region: z.string(),
  subregion: z.string().nullable(),
  capital: z.array(z.string()),
  currencies: z.array(z.object({ code: z.string(), name: z.string(), symbol: z.string().nullable() })),
  languages: z.array(z.string()),
  latlng: z.tuple([z.number(), z.number()]).nullable(),
  landlocked: z.boolean(),
  unMember: z.boolean(),
  isoStatus: z.string(),
  borders: z.array(z.string()),
  sourceIds: z.array(z.string()).min(1),
});
export type Country = z.infer<typeof Country>;

export const CoverageLevel = z.enum(['operational', 'operational-seed', 'reference']);
export type CoverageLevel = z.infer<typeof CoverageLevel>;

export const CountryCoverage = z.object({
  defaultLevel: CoverageLevel,
  updated: IsoDate,
  countries: z.record(
    Iso2,
    z.object({ level: CoverageLevel, summary: z.string(), available: z.array(z.string()), pending: z.array(z.string()) }),
  ),
});
export type CountryCoverage = z.infer<typeof CountryCoverage>;

/* ---------- organizations and authorities ---------- */

export const OrgType = z.enum([
  'intergovernmental',
  'un-system',
  'treaty-body',
  'private-business-organization',
  'non-governmental-standards-body',
  'industry-association',
]);
export type OrgType = z.infer<typeof OrgType>;

export const Organization = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  abbreviation: z.string(),
  orgType: OrgType,
  headquarters: z.object({ city: z.string(), countryCode: Iso2 }),
  website: HttpsUrl,
  /** eport editorial summary — not text from the organization. */
  summary: z.string(),
  tradeRelevance: z.array(z.string()),
  relations: z.array(Relation),
  sourceIds: z.array(z.string()).min(1),
  verification: Verification,
  publicationStatus: PublicationStatus,
});
export type Organization = z.infer<typeof Organization>;

export const AuthorityCategory = z.enum([
  'trade-ministry',
  'trade-regulator',
  'customs',
  'tax',
  'single-window',
  'export-promotion',
  'trade-portal',
  'food-safety',
  'plant-health',
  'pharmaceutical-regulator',
  'standards',
  'inspection',
  'foreign-exchange',
  'export-credit',
  'maritime',
]);
export type AuthorityCategory = z.infer<typeof AuthorityCategory>;

export const Authority = z.object({
  id: z.string().regex(/^[a-z]{2}-[a-z0-9-]+$/),
  name: z.string(),
  abbreviation: z.string().nullable(),
  category: AuthorityCategory,
  jurisdiction: Iso2,
  level: z.enum(['national', 'sub-national']),
  parentBody: z.string().nullable(),
  website: HttpsUrl,
  /** eport editorial summary — not text from the authority. */
  summary: z.string(),
  functions: z.array(z.string()),
  relations: z.array(Relation),
  sourceIds: z.array(z.string()).min(1),
  verification: Verification,
  publicationStatus: PublicationStatus,
});
export type Authority = z.infer<typeof Authority>;

/* ---------- trade documents (Phase 2 dataset; schema fixed now so relations are stable) ---------- */

export const TradeDocument = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  category: z.enum(['business-registration', 'commercial', 'transport', 'customs-regulatory', 'product-specific']),
  whatItIs: z.string(),
  whyUsed: z.string(),
  preparedBy: z.array(z.string()),
  issuedBy: z.array(z.string()),
  whenNeeded: z.string(),
  status: RequirementStatus,
  statusNote: z.string(),
  applicableCountries: z.union([z.literal('all'), z.array(Iso2)]),
  applicableProducts: z.string(),
  supportingDocuments: z.array(z.string()),
  procedure: z.array(z.string()),
  officialPortal: HttpsUrl.nullable(),
  fees: z.string().nullable(),
  validity: z.string().nullable(),
  commonMistakes: z.array(z.string()),
  /** Document Relationship Intelligence: "depends-on", "issued-by", "prepared-by" edges. */
  relations: z.array(Relation),
  sourceIds: z.array(z.string()).min(1),
  verification: Verification,
  publicationStatus: PublicationStatus,
});
export type TradeDocument = z.infer<typeof TradeDocument>;

/* ---------- API provider registry ---------- */

export const ApiProvider = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  operator: z.string(),
  docsUrl: HttpsUrl,
  dataKind: z.string(),
  auth: z.enum(['none', 'api-key', 'membership']),
  /** Result of an actual cross-origin request test — never assumed. */
  browserAccess: z.enum(['verified', 'failed', 'not-tested']),
  browserAccessCheckedOn: IsoDate.nullable(),
  browserAccessNote: z.string(),
  coverage: z.string(),
  freshness: z.string(),
  license: z.string(),
  attribution: z.string(),
  rateLimit: z.string(),
  /**
   * integrated            — called live from the browser
   * build-time-snapshot   — licence permits redistribution; fetched at build time and published as dated static files
   * approved-planned      — passed evaluation, not yet used
   * coming-soon-secure-layer — needs credentials or a proxy; not possible on a static site
   */
  integrationStatus: z.enum(['integrated', 'build-time-snapshot', 'approved-planned', 'coming-soon-secure-layer', 'external-link-only']),
  usedBy: z.array(z.string()),
  notes: z.string(),
});
export type ApiProvider = z.infer<typeof ApiProvider>;

/* ---------- news (headline + summary + link to the publisher; never full articles) ---------- */

export const NEWS_CATEGORIES = [
  'international-trade',
  'maritime-shipping',
  'ports',
  'logistics',
  'policy',
  'customs',
  'tariffs',
  'agreements',
  'supply-chains',
  'technology',
  'sustainability',
  'trade-finance',
] as const;
export const NewsCategory = z.enum(NEWS_CATEGORIES);
export type NewsCategory = z.infer<typeof NewsCategory>;

export const NewsItem = z.object({
  id: z.string().regex(/^[a-f0-9]{12}$/),
  headline: z.string().min(5).max(300),
  /** The publisher's own abstract from its feed, trimmed. May be empty. Never article body text. */
  summary: z.string().max(260),
  publisherName: z.string(),
  sourceId: z.string(),
  publishedOn: IsoDate,
  url: HttpsUrl,
  /** Topic tags applied automatically by eport from the headline and summary. */
  categories: z.array(NewsCategory).min(1).max(3),
});
export type NewsItem = z.infer<typeof NewsItem>;

export const NewsFile = z.object({
  retrievedOn: IsoDate,
  retrievedAt: z.string(),
  feeds: z.array(z.object({ sourceId: z.string(), publisherName: z.string(), feedUrl: HttpsUrl, ok: z.boolean(), items: z.number().int(), note: z.string().optional() })),
  items: z.array(NewsItem),
});
export type NewsFile = z.infer<typeof NewsFile>;

/* ---------- statistical indicators (historical statistics, never live data) ---------- */

export const IndicatorSeries = z.object({
  indicatorId: z.string(),
  /** Indicator name exactly as published by the provider. */
  name: z.string(),
  unit: z.enum(['current-usd', 'percent-of-gdp']),
  points: z.array(z.object({ year: z.number().int(), value: z.number() })),
});
export type IndicatorSeries = z.infer<typeof IndicatorSeries>;

export const IndicatorFile = z.object({
  area: z.object({ code: z.string(), name: z.string() }),
  providerId: z.string(),
  sourceId: z.string(),
  kind: z.literal('historical-statistics'),
  /** The provider's own "last updated" date for the database. */
  sourceLastUpdated: IsoDate,
  /** Date eport retrieved the snapshot. */
  retrievedOn: IsoDate,
  series: z.array(IndicatorSeries),
});
export type IndicatorFile = z.infer<typeof IndicatorFile>;

export const IndicatorIndex = z.object({
  providerId: z.string(),
  sourceId: z.string(),
  sourceLastUpdated: IsoDate,
  retrievedOn: IsoDate,
  period: z.object({ from: z.number().int(), to: z.number().int() }),
  indicators: z.array(z.object({ indicatorId: z.string(), name: z.string(), unit: IndicatorSeries.shape.unit })),
  /** Area codes (ISO alpha-3, plus "WLD") that have at least one observation. */
  areas: z.array(z.string()),
});
export type IndicatorIndex = z.infer<typeof IndicatorIndex>;

/* ---------- featured countries (computed from indicator data; drives the Countries menu) ---------- */

export const FeaturedCountries = z.object({
  retrievedOn: IsoDate,
  basis: z.object({
    indicatorId: z.string(),
    indicatorName: z.string(),
    sourceId: z.string(),
    rule: z.string(),
  }),
  /** Region name (as in the country dataset) → largest economies by the basis indicator, newest year. */
  regions: z.record(
    z.string(),
    z.array(z.object({ code: Iso2, name: z.string(), year: z.number().int(), value: z.number() })),
  ),
});
export type FeaturedCountries = z.infer<typeof FeaturedCountries>;

/* ---------- videos (official channels only; verified against YouTube oEmbed) ---------- */

export const VIDEO_TOPICS = ['trade-rules', 'customs', 'exporting', 'shipping', 'incoterms'] as const;
export const VideoTopic = z.enum(VIDEO_TOPICS);
export type VideoTopic = z.infer<typeof VideoTopic>;

export const Video = z.object({
  /** YouTube video id. */
  id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  /** Title exactly as published. */
  title: z.string(),
  /** Uploader name exactly as YouTube reports it. */
  channel: z.string(),
  sourceId: z.string(),
  topics: z.array(VideoTopic).min(1),
  verifiedOn: IsoDate,
  /** One neutral line from eport describing what the video is, derived from its title. */
  note: z.string(),
});
export type Video = z.infer<typeof Video>;

export const VideosFile = z.object({ verifiedOn: IsoDate, videos: z.array(Video) });
export type VideosFile = z.infer<typeof VideosFile>;

/* ---------- country guides (eport editorial overviews — never presented as official) ---------- */

export const GuideStep = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  summary: z.string(),
  appliesTo: z.enum(['export', 'import', 'both']),
  /** Authorities (by directory id) that run or regulate this step. */
  authorityIds: z.array(z.string()),
});
export type GuideStep = z.infer<typeof GuideStep>;

export const CountryGuide = z.object({
  countryCode: Iso2,
  /** An editorial overview is "needs-review" until an editor compares it with the official sources. */
  status: VerificationStatus,
  draftedOn: IsoDate,
  intro: z.string(),
  limits: z.string(),
  steps: z.array(GuideStep).min(3),
  sourceIds: z.array(z.string()).min(1),
});
export type CountryGuide = z.infer<typeof CountryGuide>;

/* ---------- catalog, manifest and derived indexes ---------- */

export const DatasetCoverage = z.enum(['verified', 'partial', 'seed', 'unavailable']);
export type DatasetCoverage = z.infer<typeof DatasetCoverage>;

export const CatalogEntry = z.object({
  id: z.string(),
  title: z.string(),
  /** Path under /data, or null while the dataset is not yet published. */
  path: z.string().nullable(),
  coverage: DatasetCoverage,
  scope: z.string(),
  phase: z.number().int().min(0).max(6),
  sourceIds: z.array(z.string()),
  generated: z.boolean(),
  notes: z.string(),
  /** Date the published content last changed. Null while unpublished. */
  lastUpdated: IsoDate.nullable(),
});
export type CatalogEntry = z.infer<typeof CatalogEntry>;

export const ManifestEntry = CatalogEntry.extend({
  /** Counted from the published file at build time — never typed by hand. */
  records: z.number().int().nullable(),
});
export type ManifestEntry = z.infer<typeof ManifestEntry>;

export const Manifest = z.object({
  generatedAt: z.string(),
  schemaVersion: z.number().int(),
  datasets: z.array(ManifestEntry),
});
export type Manifest = z.infer<typeof Manifest>;

export const LinkStatus = z.object({
  checkedAt: z.string().nullable(),
  results: z.record(
    z.string(),
    z.object({ ok: z.boolean(), httpStatus: z.number().nullable(), detail: z.string().optional() }),
  ),
});
export type LinkStatus = z.infer<typeof LinkStatus>;

export const SearchDoc = z.object({
  id: EntityRef,
  type: EntityType,
  title: z.string(),
  subtitle: z.string(),
  identifiers: z.array(z.string()),
  keywords: z.string(),
  path: z.string(),
  /** ISO alpha-2 of the country this record belongs to, when it has one. */
  country: z.string().nullable(),
  /** 0–1 record quality used in ranking (source reliability and completeness). */
  quality: z.number().min(0).max(1),
});
export type SearchDoc = z.infer<typeof SearchDoc>;

export const SearchIndexFile = z.object({ generatedAt: z.string(), docs: z.array(SearchDoc) });

export const GraphNode = z.object({ type: EntityType, label: z.string(), path: z.string(), meta: z.string().optional() });
export type GraphNode = z.infer<typeof GraphNode>;

export const GraphFile = z.object({
  generatedAt: z.string(),
  nodes: z.record(EntityRef, GraphNode),
  edges: z.array(z.object({ from: EntityRef, to: EntityRef, type: z.string(), note: z.string().optional() })),
});
export type GraphFile = z.infer<typeof GraphFile>;
