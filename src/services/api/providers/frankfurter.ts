/**
 * Frankfurter — daily central-bank reference exchange rates.
 * Registry id: "frankfurter". No key; browser access verified 2026-11-17.
 *
 * Reference rates are indicative. They are not bank, card or customs valuation rates,
 * and the interface must say so wherever a rate is shown.
 */
import { z } from 'zod';
import { cached, type Cached } from '../cache';
import { fetchJson } from '../http';

export const FRANKFURTER_ID = 'frankfurter';
const BASE = 'https://api.frankfurter.dev/v1';
const HOUR = 3_600_000;

const Currencies = z.record(z.string(), z.string());
const Latest = z.object({
  base: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.record(z.string(), z.number()),
});

/** Normalised, provider-independent shape used by the interface. */
export interface ReferenceRate {
  providerId: string;
  base: string;
  quote: string;
  rate: number;
  /** The rate's own observation date as published by the provider. */
  observedOn: string;
  fetchedAt: string;
  stale: boolean;
}

/** Currency codes this provider covers. Checked before asking for a rate, so unsupported currencies are never requested. */
export async function supportedCurrencies(): Promise<Set<string>> {
  const result = await cached('frankfurter:currencies', 7 * 24 * HOUR, () =>
    fetchJson(`${BASE}/currencies`, { providerId: FRANKFURTER_ID, schema: Currencies }),
  );
  return new Set(Object.keys(result.data));
}

export function normaliseRate(result: Cached<z.infer<typeof Latest>>, quote: string): ReferenceRate | null {
  const rate = result.data.rates[quote];
  if (typeof rate !== 'number') return null;
  return {
    providerId: FRANKFURTER_ID,
    base: result.data.base,
    quote,
    rate,
    observedOn: result.data.date,
    fetchedAt: result.fetchedAt,
    stale: result.stale,
  };
}

/** Latest reference rate for 1 `base` in `quote`, or null when the provider does not cover the pair. */
export async function referenceRate(base: string, quote: string): Promise<ReferenceRate | null> {
  if (base === quote) return null;
  const supported = await supportedCurrencies();
  if (!supported.has(base) || !supported.has(quote)) return null;
  const result = await cached(`frankfurter:latest:${base}:${quote}`, 6 * HOUR, () =>
    fetchJson(`${BASE}/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`, {
      providerId: FRANKFURTER_ID,
      schema: Latest,
    }),
  );
  return normaliseRate(result, quote);
}
