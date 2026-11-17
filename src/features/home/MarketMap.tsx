/**
 * "Instant access to every market" — the interactive world map with a region rail.
 * Choose a region: the map zooms to it, highlights its countries, marks its largest economies with
 * a sonar ping, and the panel below lists them with flags. Everything is built from published data.
 */
import { ArrowRight, ArrowUpRight, Globe2 } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import { Flag } from '@/components/common/Flag';
import { Reveal } from '@/components/common/motion';
import { ButtonLink, cn, Section, SectionHeading } from '@/components/common/primitives';
import { ErrorState, Skeleton } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { formatNumber, formatUsdCompact } from '@/utils/format';

const WorldMap = lazy(() => import('@/components/maps/WorldMap'));
const REGION_ORDER = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
export const regionSlug = (name: string) => name.toLowerCase();

export function MarketMap() {
  const { locale } = useI18n();
  const countries = useDataset('countries');
  const coverage = useDataset('coverage');
  const featured = useDataset('featured');
  const trade = useDataset('trade-regions');
  const [region, setRegion] = useState<string | null>(null);
  const error = countries.error ?? coverage.error ?? featured.error;

  const regions = featured.data ? [...REGION_ORDER.filter((r) => featured.data.regions[r]), ...Object.keys(featured.data.regions).filter((r) => !REGION_ORDER.includes(r))] : [];
  const list = region ? (featured.data?.regions[region] ?? []) : [];
  const stats = region ? trade.data?.regions[region] : undefined;
  const count = (r: string) => countries.data?.filter((c) => c.region === r).length ?? 0;

  const pill = (active: boolean) =>
    cn(
      'flex min-h-11 items-center gap-2.5 rounded-xl px-4 py-2.5 text-start text-sm font-semibold whitespace-nowrap transition-all duration-200 lg:w-full',
      active ? 'bg-navy text-white shadow-[0_10px_24px_-14px_rgb(11_31_51/0.9)] dark:bg-ocean' : 'border border-line bg-surface text-heading hover:border-link hover:text-link',
    );

  return (
    <Section aria-labelledby="map-heading">
      <Reveal>
        <SectionHeading
          id="map-heading"
          kicker="Country exploration"
          title="Instant access to every market"
          description="Choose a region to zoom in and see its largest economies, or open any country for its map, indicators, partners and authorities."
          action={
            <ButtonLink to="/countries" variant="secondary">
              Browse all countries
              <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </ButtonLink>
          }
        />
      </Reveal>

      {error ? (
        <ErrorState error={error} onRetry={() => (countries.reload(), coverage.reload(), featured.reload())} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
          <div role="group" aria-label="Choose a region" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            <button type="button" aria-pressed={region === null} onClick={() => setRegion(null)} className={pill(region === null)}>
              <Globe2 aria-hidden="true" className="size-4 shrink-0" />
              World
            </button>
            {featured.status !== 'ready'
              ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-xl lg:w-full" />)
              : regions.map((r) => (
                  <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)} className={pill(region === r)}>
                    <Globe2 aria-hidden="true" className="size-4 shrink-0 opacity-70" />
                    {r}
                    <span className="tabular ms-auto text-xs font-normal opacity-90">{count(r)}</span>
                  </button>
                ))}
          </div>

          <div className="min-w-0">
            <Reveal from="scale">
              {countries.data && coverage.data ? (
                <Suspense fallback={<Skeleton className="aspect-[96/50] w-full rounded-xl" />}>
                  <WorldMap countries={countries.data} coverage={coverage.data} region={region} featured={featured.data?.regions} />
                </Suspense>
              ) : (
                <Skeleton className="aspect-[96/50] w-full rounded-xl" />
              )}
            </Reveal>

            <div className="mt-5 rounded-2xl border border-line bg-surface p-5" aria-live="polite">
              {region ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h3 className="font-display text-xl font-bold">{region}</h3>
                    {stats && (
                      <p className="tabular text-sm text-muted">
                        {formatNumber(count(region), locale)} countries · {stats.reporters} with 2023 goods-trade reports · exports {formatUsdCompact(stats.exports * 1000, locale)}
                      </p>
                    )}
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {list.map((c) => (
                      <li key={c.code}>
                        <Link to={`/countries/${c.code}`} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-soft px-3 text-sm font-medium text-heading transition-colors hover:border-link hover:text-link">
                          <Flag code={c.code} />
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted">The largest economies in the region by exports of goods and services (World Bank). The marked points on the map show them.</p>
                  <Link to={`/regions/${regionSlug(region)}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:text-link-hover">
                    {region} trade overview <ArrowUpRight aria-hidden="true" className="size-4" />
                  </Link>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-xl text-sm leading-relaxed text-ink">Hover a country for its name and latest exports; click to open its profile. Hatched countries have guidance in progress. Pick a region on the left to zoom in.</p>
                  <ButtonLink to="/trade" variant="primary" size="md">
                    Compare any two countries
                    <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
