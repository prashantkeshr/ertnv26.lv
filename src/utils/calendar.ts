/**
 * Weekend days for a country, from the browser's built-in Unicode CLDR data (Intl.Locale week info).
 * Returns null when the browser does not expose it, so callers can hide the fact instead of guessing.
 * Note: the weekend is a general civil convention; customs offices and carriers may differ.
 */

interface WeekInfo {
  weekend: number[];
}

/** 1 = Monday … 7 = Sunday, as in Intl.Locale week info. */
export function weekendDays(regionCode: string): number[] | null {
  // Only a real two-letter region code is looked up; anything else would silently get CLDR's world default.
  if (!/^[A-Z]{2}$/.test(regionCode)) return null;
  try {
    const locale = new Intl.Locale(`und-${regionCode}`).maximize() as Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    return info?.weekend?.length ? [...info.weekend].sort((a, b) => a - b) : null;
  } catch {
    return null;
  }
}

const NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function weekendLabel(days: number[]): string {
  return days.map((d) => NAMES[d] ?? '').filter(Boolean).join(' and ');
}

/** Today's date as YYYY-MM-DD in UTC. */
export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
