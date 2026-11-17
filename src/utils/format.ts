/** Locale-aware formatting. All functions take the active locale so numbers and dates follow the reader. */

/** "US$34.9 trillion" — US dollars are written with an explicit "US$" in every locale to avoid ambiguity. */
export function formatUsdCompact(value: number, locale = 'en'): string {
  const body = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'long',
    maximumSignificantDigits: 3,
  }).format(value);
  return `US$${body}`;
}

export function formatUsdAxis(value: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'short', maximumSignificantDigits: 2 }).format(value);
}

export function formatPercent(value: number, locale = 'en', digits = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value) + '%';
}

export function formatNumber(value: number, locale = 'en', maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatRate(value: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 5 }).format(value);
}

/** Formats an ISO date (YYYY-MM-DD) or timestamp as "17 Nov 2026", in UTC so the day never shifts. */
export function formatDate(iso: string, locale = 'en'): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  // Plain "en" would resolve to US month-first order; an international audience gets day-month-year.
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** Year-over-year change in percent, or null when either value is missing or the base is zero. */
export function percentChange(current: number | undefined, previous: number | undefined): number | null {
  if (current === undefined || previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
