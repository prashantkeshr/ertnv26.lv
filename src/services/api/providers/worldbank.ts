/**
 * World Bank Indicators API v2 — response validation and normalisation.
 *
 * The API does not send CORS headers (tested in a browser on 2026-11-17), so eport cannot
 * call it from the page. Instead scripts/fetch-worldbank.ts retrieves it at build time and
 * publishes dated static files, as the CC BY 4.0 licence permits. This module is the
 * shared, Node-safe normaliser used by that script and covered by unit tests.
 */
import { z } from 'zod';
import type { IndicatorSeries } from '@/types/schemas';

export const WORLD_BANK_PROVIDER_ID = 'worldbank-indicators';
export const WORLD_BANK_SOURCE_ID = 'worldbank-wdi';

/** Indicators eport publishes. Names are taken from the API response, not written by eport. */
export const WORLD_BANK_INDICATORS: Array<{ indicatorId: string; unit: IndicatorSeries['unit'] }> = [
  { indicatorId: 'NE.EXP.GNFS.CD', unit: 'current-usd' },
  { indicatorId: 'NE.IMP.GNFS.CD', unit: 'current-usd' },
  { indicatorId: 'NY.GDP.MKTP.CD', unit: 'current-usd' },
  { indicatorId: 'NE.TRD.GNFS.ZS', unit: 'percent-of-gdp' },
];

export function worldBankUrl(indicatorId: string, from: number, to: number, page = 1): string {
  return `https://api.worldbank.org/v2/country/all/indicator/${indicatorId}?format=json&per_page=10000&date=${from}:${to}&page=${page}`;
}

const Meta = z.object({ page: z.number(), pages: z.number(), total: z.number(), lastupdated: z.string() });
const Row = z.object({
  indicator: z.object({ id: z.string(), value: z.string() }),
  country: z.object({ id: z.string(), value: z.string() }),
  countryiso3code: z.string(),
  date: z.string(),
  value: z.number().nullable(),
});
export const WorldBankResponse = z.tuple([Meta, z.array(Row).nullable()]);

export interface NormalisedPage {
  pages: number;
  lastUpdated: string;
  indicatorName: string | null;
  /** One entry per area that has at least one non-null observation on this page. */
  observations: Array<{ code: string; areaName: string; year: number; value: number }>;
}

/**
 * Validates a raw API page and keeps only real observations.
 * Missing values stay missing — they are never filled, interpolated or zeroed.
 */
export function normaliseWorldBankPage(raw: unknown): NormalisedPage {
  const [meta, rows] = WorldBankResponse.parse(raw);
  const observations: NormalisedPage['observations'] = [];
  for (const row of rows ?? []) {
    const year = Number(row.date);
    if (row.value === null || !row.countryiso3code || !Number.isInteger(year)) continue;
    observations.push({ code: row.countryiso3code, areaName: row.country.value, year, value: row.value });
  }
  return {
    pages: meta.pages,
    lastUpdated: meta.lastupdated,
    indicatorName: rows?.[0]?.indicator.value ?? null,
    observations,
  };
}
