/**
 * Page titles and descriptions that are written in two places — into each page's static HTML at
 * build time (scripts/seo-pages.ts) and into the document head by the running app (useSeo).
 * Keeping them in one node-safe module means a crawler reading the raw HTML and one that runs the
 * page see the same words.
 */
import { SECTOR_LABEL } from '@/services/api/providers/wits';

export const countryTitle = (name: string) => `${name} trade profile: partners, indicators, guide`;

export interface CountrySeoInput {
  name: string;
  cca2: string;
  cca3: string;
  /** Names of the largest goods-export destinations, largest first (empty when there is no report). */
  topExportMarkets: string[];
  /** Largest export sector ids, largest first. */
  topExportSectors: string[];
}

export function countryDescription({ name, cca2, cca3, topExportMarkets, topExportSectors }: CountrySeoInput): string {
  const markets = topExportMarkets.slice(0, 3);
  if (markets.length === 0) {
    return `${name} (${cca2}, ${cca3}): trade indicators, reference exchange rate, map and a step-by-step import–export framework.`;
  }
  const list = markets.length === 1 ? markets[0]! : `${markets.slice(0, -1).join(', ')} and ${markets[markets.length - 1]}`;
  const sector = topExportSectors[0] ? SECTOR_LABEL[topExportSectors[0]] ?? '' : '';
  return `${name}: top goods export markets ${list}${sector ? `; leading exports ${sector.toLowerCase()}` : ''}. Trade indicators, holidays, exchange rate and an import–export guide.`;
}
