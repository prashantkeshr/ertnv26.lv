/**
 * Country page hero: coverage status, title, a short templated summary built only from real
 * facts, calls to action, the highlighted-country map, and a strip of key facts (languages,
 * currency with a live reference rate, weekend, next public holiday, geography).
 */
import { Anchor, ArrowRight, Banknote, CalendarCheck, CalendarOff, Languages, type LucideIcon } from 'lucide-react';
import { lazy, Suspense, type ReactNode } from 'react';
import { Flag } from '@/components/common/Flag';
import { Breadcrumbs, type Crumb } from '@/components/common/PageHeader';
import { buttonClass } from '@/components/common/primitives';
import { Skeleton } from '@/components/feedback/states';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { referenceRate } from '@/services/api/providers/frankfurter';
import type { Country, CountryCoverage, CoverageLevel } from '@/types/schemas';
import { weekendDays, weekendLabel } from '@/utils/calendar';
import { formatDate, formatRate } from '@/utils/format';
import { useHolidays } from './useHolidays';

const CountryMap = lazy(() => import('@/components/maps/CountryMap'));

export function summaryFor(country: Country, level: CoverageLevel, coverage?: CountryCoverage['countries'][string]): string {
  const where = country.subregion ?? country.region;
  const kind = country.unMember ? 'UN member state' : 'territory';
  const geo = country.landlocked ? 'landlocked' : 'coastal';
  const capital = country.capital[0] ? ` Its capital is ${country.capital[0]}.` : '';
  const guidance =
    level === 'reference' || !coverage
      ? 'eport has not yet published export or import procedures for it; this profile offers identifiers, sourced indicators and links to official sources.'
      : coverage.summary;
  return `${country.name} is a ${geo} ${kind} in ${where}.${capital} ${guidance}`;
}

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/8 text-sky ring-1 ring-white/10">
        <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <div className="mt-0.5 text-sm leading-snug text-white/75">{children}</div>
      </div>
    </div>
  );
}

function FactStrip({ country }: { country: Country }) {
  const { locale } = useI18n();
  const currency = country.currencies[0];
  const code = currency?.code ?? '';
  const rate = useAsync(`hero-fx:${code}`, async () => (code && code !== 'USD' ? referenceRate('USD', code) : null));
  const holidays = useHolidays(country.cca2, 1);
  const weekend = weekendDays(country.cca2);
  const next = holidays.data?.available ? holidays.data.holidays[0] : undefined;

  return (
    <div className="grid gap-x-8 gap-y-6 border-t border-white/12 pt-8 sm:grid-cols-2 lg:grid-cols-5">
      <Fact icon={Languages} label="Languages">
        {country.languages.length ? country.languages.slice(0, 4).join(', ') + (country.languages.length > 4 ? ` +${country.languages.length - 4}` : '') : 'Not recorded'}
      </Fact>
      <Fact icon={Banknote} label="Currency">
        {currency ? (
          <>
            {currency.name} ({currency.code})
            {rate.status === 'ready' && rate.data && (
              <span className="tabular mt-0.5 block text-xs text-white/65">
                1 USD = {formatRate(rate.data.rate, locale)} {rate.data.quote}
              </span>
            )}
          </>
        ) : (
          'Not recorded'
        )}
      </Fact>
      <Fact icon={CalendarOff} label="Typical weekend">
        {weekend ? (
          <>
            {weekendLabel(weekend)}
            <span className="mt-0.5 block text-xs text-white/65">Civil convention (CLDR)</span>
          </>
        ) : (
          'Not available in this browser'
        )}
      </Fact>
      <Fact icon={CalendarCheck} label="Next public holiday">
        {holidays.status === 'loading' ? (
          <Skeleton className="h-4 w-32 opacity-40" />
        ) : next ? (
          <>
            {next.name}
            <span className="tabular mt-0.5 block text-xs text-white/65">{formatDate(next.date, locale)}</span>
          </>
        ) : (
          'No holiday data for this country'
        )}
      </Fact>
      <Fact icon={Anchor} label="Geography">
        {country.landlocked ? 'Landlocked' : 'Has a coastline'}
        <span className="mt-0.5 block text-xs text-white/65">
          {country.borders.length ? `${country.borders.length} land neighbour${country.borders.length === 1 ? '' : 's'}` : 'No land borders'}
        </span>
      </Fact>
    </div>
  );
}

interface CountryHeroProps {
  country: Country;
  countries: Country[];
  level: CoverageLevel;
  coverage?: CountryCoverage['countries'][string];
  crumbs: Crumb[];
  authorityCount: number;
}

export function CountryHero({ country, countries, level, coverage, crumbs, authorityCount }: CountryHeroProps) {
  const guided = level !== 'reference';
  return (
    <header className="hero-bg relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-80" />
      <div className="container-page pt-8 pb-10 sm:pt-10 sm:pb-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-6">
          <div>
            <p
              className={`rise inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${guided ? 'border-emerald-300/50 bg-emerald-400/10 text-emerald-200' : 'border-white/20 bg-white/5 text-white/80'}`}
              style={{ '--d': '0ms' } as React.CSSProperties}
            >
              <span className="relative flex size-2">
                {guided && <span className="ping absolute inline-flex size-full rounded-full bg-emerald-300 opacity-70" />}
                <span className={`relative inline-flex size-2 rounded-full ${guided ? 'bg-emerald-300' : 'bg-white/60'}`} />
              </span>
              {guided ? 'Operational guidance in progress' : 'Reference record'}
            </p>
            <div className="mt-5">
              <Breadcrumbs items={crumbs} />
            </div>
            <div className="rise flex items-center gap-4" style={{ '--d': '90ms' } as React.CSSProperties}>
              <Flag code={country.cca2} className="!h-9 !w-12 !rounded-md" />
              <h1 className="text-4xl leading-tight font-extrabold text-white sm:text-5xl">{country.name}</h1>
            </div>
            <p className="rise mt-1 text-sm text-white/70" style={{ '--d': '140ms' } as React.CSSProperties}>
              {country.officialName} · ISO {country.cca2} · {country.cca3}
              {country.ccn3 && ` · ${country.ccn3}`}
            </p>
            <p className="rise mt-5 max-w-xl text-base leading-relaxed text-white/85" style={{ '--d': '200ms' } as React.CSSProperties}>
              {summaryFor(country, level, coverage)}
            </p>
            <div className="rise mt-7 flex flex-wrap gap-3" style={{ '--d': '280ms' } as React.CSSProperties}>
              <a href="#authorities" className={buttonClass('light', 'lg')}>
                {authorityCount > 0 ? `See ${authorityCount} authorit${authorityCount === 1 ? 'y' : 'ies'}` : 'Authorities and next steps'}
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              <a href="#guide" className={buttonClass('inverse', 'lg')}>
                {guided ? 'Read the process guide' : 'What eport covers here'}
              </a>
            </div>
          </div>
          <div className="relative">
            <Suspense fallback={<Skeleton className="aspect-[96/56] w-full opacity-30" />}>
              <CountryMap country={country} countries={countries} className="block h-auto w-full" />
            </Suspense>
            <p className="mt-1 text-end text-xs text-white/60">Natural Earth outlines · no political endorsement implied</p>
          </div>
        </div>
        <div className="mt-8">
          <FactStrip country={country} />
        </div>
      </div>
    </header>
  );
}
