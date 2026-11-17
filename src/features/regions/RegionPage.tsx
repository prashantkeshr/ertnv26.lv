/**
 * Region overview: Africa, Americas, Asia, Europe, Oceania.
 * Everything is derived from published data — countries (ISO dataset), largest economies (World
 * Bank indicators) and trade flows (WITS snapshot, goods only, as reported by each country).
 */
import { ArrowRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { Flag } from '@/components/common/Flag';
import { Reveal } from '@/components/common/motion';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { ButtonLink, buttonClass, ExternalLink } from '@/components/common/primitives';
import { Badge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock, Skeleton } from '@/components/feedback/states';
import { SectionNav } from '@/components/navigation/SectionNav';
import { sectorLabel } from '@/features/trade/sectors';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { formatDate, formatNumber, formatPercent, formatUsdCompact } from '@/utils/format';

const WorldMap = lazy(() => import('@/components/maps/WorldMap'));

export const REGIONS = ['africa', 'americas', 'asia', 'europe', 'oceania'] as const;
const NAV = [
  { id: 'map', label: 'Map' },
  { id: 'destinations', label: 'Where exports go' },
  { id: 'economies', label: 'Largest economies' },
  { id: 'lanes', label: 'Top lanes' },
  { id: 'sectors', label: 'Sectors' },
  { id: 'countries', label: 'All countries' },
];

function Bar({ share }: { share: number }) {
  return (
    <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-line">
      <span className="block h-full rounded-full bg-gradient-to-r from-ocean to-aurora" style={{ width: `${Math.max(1.5, Math.min(100, share * 100))}%` }} />
    </span>
  );
}

function H2({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h2 id={`${id}-heading`} className="text-2xl font-bold">
        {title}
      </h2>
      {lead && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

export default function RegionPage() {
  const { locale } = useI18n();
  const slug = (useParams().slug ?? '').toLowerCase();
  const countries = useDataset('countries');
  const coverage = useDataset('coverage');
  const featured = useDataset('featured');
  const trade = useDataset('trade-regions');
  const index = useDataset('trade-index');

  const name = featured.data ? Object.keys(featured.data.regions).find((r) => r.toLowerCase() === slug) : undefined;
  const pageName = name ?? slug.replace(/^\w/, (c) => c.toUpperCase());
  const crumbs = [{ label: 'Regions', path: '/countries' }, { label: pageName }];
  const stats = name ? trade.data?.regions[name] : undefined;

  useSeo({
    title: name ? `Trade in ${name} — economies, lanes and countries` : 'Region',
    description: name ? `${name}: its countries, largest economies, where its goods exports go and the largest trade lanes, from World Bank data. Pick any country for its map, partners and authorities.` : 'Region overview on eport.',
    path: `/regions/${slug}`,
    noindex: !name,
  });

  const error = countries.error ?? coverage.error ?? featured.error ?? trade.error;
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState error={error} onRetry={() => (countries.reload(), coverage.reload(), featured.reload(), trade.reload())} />
      </div>
    );
  }
  if (!countries.data || !coverage.data || !featured.data || !trade.data) {
    return (
      <div className="container-page py-16">
        <LoadingBlock lines={8} className="max-w-2xl" />
      </div>
    );
  }
  if (!name) {
    return (
      <div className="container-page py-16">
        <EmptyState title={`There is no region called “${slug}”`} description="Regions are Africa, Americas, Asia, Europe and Oceania." action={<ButtonLink to="/countries">Browse all countries</ButtonLink>} />
      </div>
    );
  }

  const inRegion = countries.data.filter((c) => c.region === name);
  const lanes = stats?.lanes ?? [];
  const byCode = new Map(countries.data.map((c) => [c.cca2, c]));
  const destEntries = stats ? Object.entries(stats.destinations).filter(([r]) => r !== 'Antarctic') : [];
  const destTotal = destEntries.reduce((s, [, v]) => s + v, 0);
  const dest = destEntries.sort((a, b) => b[1] - a[1]);
  const sectorTotal = stats ? stats.sectors.reduce((s, [, v]) => s + v, 0) : 0;
  const withData = new Set(index.data?.reporters ?? []);
  const own = dest.find(([r]) => r === name);
  const topOther = dest.find(([r]) => r !== name);
  const money = (thousand: number) => formatUsdCompact(thousand * 1000, locale);

  return (
    <>
      <header className="hero-bg relative isolate overflow-hidden text-white">
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-80" />
        <div className="container-page pt-8 pb-12 sm:pt-10">
          <Breadcrumbs items={crumbs} />
          <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="rise text-xs font-semibold tracking-[0.14em] text-sky uppercase" style={{ '--d': '0ms' } as React.CSSProperties}>
                eport Intelligence · Region
              </p>
              <h1 className="rise mt-2 text-4xl leading-tight font-extrabold text-white sm:text-5xl" style={{ '--d': '80ms' } as React.CSSProperties}>
                Trade in {name}
              </h1>
              <p className="rise mt-5 max-w-xl text-base leading-relaxed text-white/85" style={{ '--d': '160ms' } as React.CSSProperties}>
                {name} has {formatNumber(inRegion.length, locale)} countries and territories.
                {stats && (
                  <>
                    {' '}
                    {stats.reporters} of them reported goods trade for {trade.data.year}; together they exported {money(stats.exports)} and imported {money(stats.imports)}.
                    {own && destTotal > 0 && <> {formatPercent((own[1] / destTotal) * 100, locale, 0)} of those exports stayed within the region</>}
                    {topOther && destTotal > 0 && <>, and {formatPercent((topOther[1] / destTotal) * 100, locale, 0)} went to {topOther[0]}</>}
                    {own && destTotal > 0 ? '.' : ''}
                  </>
                )}
              </p>
              <div className="rise mt-7 flex flex-wrap gap-3" style={{ '--d': '240ms' } as React.CSSProperties}>
                <Link to="/trade" className={buttonClass('light', 'lg')}>
                  Compare any two countries
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link to={`/countries?region=${encodeURIComponent(name)}`} className={buttonClass('inverse', 'lg')}>
                  All {inRegion.length} countries
                </Link>
              </div>
            </div>
            {stats && (
              <dl className="grid grid-cols-2 gap-3">
                {[
                  ['Countries and territories', formatNumber(inRegion.length, locale)],
                  ['With a 2023 trade report', `${stats.reporters}`],
                  ['Goods exports', money(stats.exports)],
                  ['Goods imports', money(stats.imports)],
                ].map(([label, value], i) => (
                  <div key={label} className="glass float rounded-xl p-4" style={{ '--d': `${i * 400}ms` } as React.CSSProperties}>
                    <dt className="text-xs text-sky">{label}</dt>
                    <dd className="tabular mt-1 font-display text-2xl font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </header>
      <SectionNav sections={NAV} />

      <div className="container-page space-y-20 py-12">
        <section id="map" aria-labelledby="map-heading" className="scroll-mt-36">
          <H2 id="map" title={`${name} on the map`} lead="The region’s largest economies are marked. Hover a country for its latest exports; click to open it." />
          <Suspense fallback={<Skeleton className="aspect-[96/50] w-full rounded-xl" />}>
            <WorldMap countries={countries.data} coverage={coverage.data} region={name} featured={featured.data.regions} />
          </Suspense>
        </section>

        {stats && (
          <section id="destinations" aria-labelledby="destinations-heading" className="scroll-mt-36">
            <H2 id="destinations" title={`Where ${name}’s goods exports go`} lead={`Exports from the ${stats.reporters} reporting countries, grouped by the region of the destination. As reported by each exporter.`} />
            <ul className="space-y-4">
              {dest.map(([region, value], i) => (
                <li key={region}>
                  <Reveal delay={i * 60}>
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="font-semibold text-heading">
                        {region}
                        {region === name && <span className="ms-2 text-xs font-normal text-muted">(within the region)</span>}
                      </span>
                      <span className="tabular text-ink">
                        {money(value)} · {formatPercent((value / destTotal) * 100, locale, 1)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Bar share={value / (dest[0]?.[1] || 1)} />
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">Shares are of exports to partners that are countries in eport’s dataset; unspecified and regional-group partners are excluded.</p>
          </section>
        )}

        <section id="economies" aria-labelledby="economies-heading" className="scroll-mt-36">
          <H2 id="economies" title={`Largest economies in ${name}`} lead="Ranked by exports of goods and services in each country’s latest reported year (World Bank)." />
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data.regions[name]!.map((c, i) => (
              <li key={c.code}>
                <Reveal delay={(i % 3) * 70}>
                  <Link to={`/countries/${c.code}`} className="spot group flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
                    <span aria-hidden="true" className="tabular w-5 text-xs text-muted">
                      {i + 1}
                    </span>
                    <Flag code={c.code} className="!h-5 !w-7" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading group-hover:text-link">{c.name}</span>
                      <span className="tabular block text-xs text-muted">
                        {formatUsdCompact(c.value, locale)} · {c.year}
                      </span>
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {lanes.length > 0 && (
          <section id="lanes" aria-labelledby="lanes-heading" className="scroll-mt-36">
            <H2 id="lanes" title={`Largest trade lanes from ${name}`} lead="One-way goods flows as reported by the exporting country. Open one to compare both directions." />
            <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {lanes.map(([from, to, value], i) => {
                const a = byCode.get(from);
                const b = byCode.get(to);
                if (!a || !b) return null;
                return (
                  <li key={`${from}-${to}`}>
                    <Link to={`/trade/${from}/${to}`} className="group flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-soft">
                      <span aria-hidden="true" className="tabular w-5 text-xs text-muted">
                        {i + 1}
                      </span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-heading group-hover:text-link">
                        <Flag code={from} /> {a.name}
                        <ArrowRight aria-hidden="true" className="size-4 text-muted rtl:rotate-180" />
                        <Flag code={to} /> {b.name}
                      </span>
                      <span className="tabular ms-auto text-sm text-ink">{money(value)}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {stats && stats.sectors.length > 0 && (
          <section id="sectors" aria-labelledby="sectors-heading" className="scroll-mt-36">
            <H2 id="sectors" title={`What ${name} exports`} lead="Goods exports of the reporting countries by Harmonized System section." />
            <ul className="grid gap-4 sm:grid-cols-2">
              {stats.sectors.slice(0, 8).map(([id, value]) => (
                <li key={id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-heading">{sectorLabel(id)}</span>
                    <span className="tabular text-xs text-muted">
                      {money(value)} · {formatPercent((value / sectorTotal) * 100, locale, 1)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Bar share={value / (stats.sectors[0]?.[1] || 1)} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="countries" aria-labelledby="countries-heading" className="scroll-mt-36">
          <H2 id="countries" title={`All ${inRegion.length} countries and territories in ${name}`} lead="A dot marks countries with a published goods-trade report for 2023." />
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {inRegion.map((c) => (
              <li key={c.cca2}>
                <Link to={`/countries/${c.cca2}`} className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-soft">
                  <Flag code={c.cca2} />
                  <span className="min-w-0 flex-1 truncate font-medium text-heading">{c.name}</span>
                  {withData.has(c.cca3) && (
                    <span title="Has a 2023 goods-trade report" className="size-1.5 shrink-0 rounded-full bg-link">
                      <span className="sr-only">Has a 2023 goods-trade report</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-6 text-xs text-muted">
          <Badge tone="neutral">Historical annual statistics · goods only</Badge>
          <span>
            Sources: <ExternalLink href="https://wits.worldbank.org/">World Bank WITS</ExternalLink> (trade, CC BY 4.0) and <ExternalLink href="https://data.worldbank.org/">World Development Indicators</ExternalLink>.
            Totals include only countries that reported; others are not estimated. Retrieved {formatDate(trade.data.retrievedOn, locale)}.
          </span>
        </p>
      </div>
    </>
  );
}
