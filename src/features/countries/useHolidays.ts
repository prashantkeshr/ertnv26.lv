import { useAsync } from '@/hooks/useAsync';
import { publicHolidays, upcoming, type Holiday } from '@/services/api/providers/nager';
import { todayIso } from '@/utils/calendar';

export type HolidayResult = { available: false } | { available: true; holidays: Holiday[]; stale: boolean };

/** The next few public holidays for a country, looking into next year when this year is nearly over. */
export function useHolidays(countryCode: string, count = 5) {
  return useAsync<HolidayResult>(`holidays:${countryCode}:${count}`, async () => {
    const today = todayIso();
    const year = Number(today.slice(0, 4));
    const current = await publicHolidays(countryCode, year);
    if (!current.data) return { available: false };
    let list = upcoming(current.data, today, count);
    if (list.length < count) {
      const next = await publicHolidays(countryCode, year + 1).catch(() => null);
      if (next?.data) list = [...list, ...upcoming(next.data, today, count - list.length)];
    }
    return { available: true, holidays: list, stale: current.stale };
  });
}
