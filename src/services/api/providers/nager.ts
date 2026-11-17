/**
 * Nager.Date — public holidays by country and year.
 * Registry id: "nager-date". No key; browser access verified 2026-11-17 (CORS *).
 *
 * Coverage is partial: some countries answer HTTP 204 (no data) or 404. In those cases eport
 * says holidays are unavailable — it never guesses. Informational only: confirm working days
 * with the customs authority and carrier.
 */
import { z } from 'zod';
import { cached, type Cached } from '../cache';
import { fetchJsonOrEmpty } from '../http';
import { ApiError } from '../http';

export const NAGER_ID = 'nager-date';
const DAY = 86_400_000;

const Response = z.array(
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    localName: z.string(),
    name: z.string(),
    global: z.boolean().optional(),
    types: z.array(z.string()).optional(),
  }),
);

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  /** Observed nationwide (true) or only in some regions (false). */
  nationwide: boolean;
}

export function normaliseHolidays(raw: z.infer<typeof Response>): Holiday[] {
  return raw
    .filter((h) => !h.types || h.types.includes('Public'))
    .map((h) => ({ date: h.date, localName: h.localName, name: h.name, nationwide: h.global !== false }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Holidays for one country and year, or null when the provider has no data for that country. */
export async function publicHolidays(countryCode: string, year: number): Promise<Cached<Holiday[] | null>> {
  return cached(`nager:${countryCode}:${year}`, DAY, async () => {
    try {
      const raw = await fetchJsonOrEmpty(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`, { providerId: NAGER_ID, schema: Response });
      return raw === null || raw.length === 0 ? null : normaliseHolidays(raw);
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'not-found') return null;
      throw e;
    }
  });
}

/** The next `count` holidays on or after `today` (ISO date), looking into the following year if needed. */
export function upcoming(holidays: Holiday[], today: string, count: number): Holiday[] {
  return holidays.filter((h) => h.date >= today).slice(0, count);
}
