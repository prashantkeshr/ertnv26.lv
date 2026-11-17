/** Weekend (browser CLDR data) and upcoming public holidays (Nager.Date, live) for a country. Informational only. */
import { CalendarCheck } from 'lucide-react';
import { ExternalLink } from '@/components/common/primitives';
import { Badge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useI18n } from '@/i18n';
import { describeApiError } from '@/services/api/errors';
import type { Country } from '@/types/schemas';
import { weekendDays, weekendLabel } from '@/utils/calendar';
import { formatDate } from '@/utils/format';
import { useHolidays } from './useHolidays';

export function WorkingDays({ country }: { country: Country }) {
  const { locale } = useI18n();
  const holidays = useHolidays(country.cca2, 6);
  const weekend = weekendDays(country.cca2);

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-link uppercase">Typical weekend</p>
        <p className="mt-2 font-display text-xl font-bold text-heading">{weekend ? weekendLabel(weekend) : 'Not available'}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">From Unicode CLDR data in your browser. Customs offices, ports and carriers may keep different hours — confirm before planning a clearance date.</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-link uppercase">Upcoming public holidays</p>
        <div className="mt-3">
          {holidays.status === 'loading' && <LoadingBlock lines={4} label="Loading public holidays" />}
          {holidays.status === 'error' && <ErrorState title="Public holidays are unavailable" description={describeApiError(holidays.error)} onRetry={holidays.reload} />}
          {holidays.status === 'ready' && !holidays.data.available && (
            <EmptyState icon={CalendarCheck} title={`No public-holiday data for ${country.name}`} description="The holiday service has no calendar for this country. eport does not guess — check the national customs authority’s calendar." />
          )}
          {holidays.status === 'ready' && holidays.data.available && (
            <>
              <ol className="divide-y divide-line">
                {holidays.data.holidays.map((h) => (
                  <li key={h.date + h.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                    <span className="text-sm font-semibold text-heading">
                      {h.name}
                      {h.localName !== h.name && <span className="ms-2 font-normal text-muted">{h.localName}</span>}
                    </span>
                    <span className="tabular flex items-center gap-2 text-sm text-ink">
                      {formatDate(h.date, locale)}
                      {!h.nationwide && <Badge tone="warn">Some regions</Badge>}
                    </span>
                  </li>
                ))}
              </ol>
              {holidays.data.stale && <p className="mt-2 text-xs text-warn">Showing cached data — the holiday service could not be refreshed.</p>}
            </>
          )}
        </div>
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
          Public holidays via <ExternalLink href="https://date.nager.at/">Nager.Date</ExternalLink> (MIT). Informational only: regional and religious observances may be missing or change at short notice.
        </p>
      </div>
    </div>
  );
}
