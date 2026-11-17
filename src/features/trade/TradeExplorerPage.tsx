/**
 * Trade Explorer — any two countries.
 *
 * Merchandise trade from the World Bank WITS snapshot, as reported by each country. A pair is shown
 * with both sides' own reports (exports reported by the exporter, imports reported by the importer);
 * where one side did not report, the other side's mirror report is used and labelled. Nothing is
 * estimated, and a country WITS does not cover is said to be uncovered.
 */
import { ArrowLeftRight, ArrowRight, Info } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { routeMeta } from '@/app/route-meta';
import { Flag } from '@/components/common/Flag';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { Button, cn, ExternalLink, inputClass } from '@/components/common/primitives';
import { Badge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { Reveal } from '@/components/common/motion';
import { useAsync, useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { loadPartners } from '@/services/data/loader';
import type { Country, TradePartnersFile } from '@/types/schemas';
import { formatDate, formatPercent, formatUsdCompact } from '@/utils/format';
import { balanceFor, flowTotal, pairReport, rankOf, reportGap, sectorRows, toUsd, valueWith } from './tradeMath';

const CRUMBS = [{ label: 'Trade Explorer' }];

function FlowCard({ from, to, exporter, importer, delay }: { from: Country; to: Country; exporter: TradePartnersFile | null; importer: TradePartnersFile | null; delay: number }) {
  const { locale } = useI18n();
  const own = exporter ? valueWith(exporter, 'exports', to.cca3) : null;
  const mirror = importer ? valueWith(importer, 'imports', from.cca3) : null;
  const headline = own ?? mirror;
  const gap = reportGap(own, mirror);
  const share = exporter && own !== null ? own / flowTotal(exporter, 'exports') : null;
  const rank = exporter && own !== null ? rankOf(exporter, 'exports', to.cca3) : null;
  const money = (v: number | null) => (v === null ? null : formatUsdCompact(toUsd(v), locale));

  return (
    <Reveal delay={delay}>
      <article className="h-full rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
          <Flag code={from.cca2} /> {from.name}
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          <Flag code={to.cca2} /> {to.name}
        </h3>
        {headline === null ? (
          <p className="mt-4 text-sm leading-relaxed text-ink">
            Neither {from.name} nor {to.name} reported goods exports from {from.name} to {to.name} for this year, so eport has no figure to show.
          </p>
        ) : (
          <>
            <p className="tabular mt-3 font-display text-4xl font-extrabold text-heading">{money(headline)}</p>
            <p className="mt-1 text-xs text-muted">
              {own !== null ? `Exports of goods, as reported by ${from.name}` : `Imports of goods, as reported by ${to.name} (${from.name} did not report this pair)`}
            </p>
            {share !== null && (
              <p className="tabular mt-4 text-sm text-ink">
                <strong className="font-semibold text-heading">{formatPercent(share * 100, locale, 1)}</strong> of {from.name}’s goods exports
                {rank !== null && (
                  <>
                    {' '}
                    · its <strong className="font-semibold text-heading">#{rank}</strong> destination
                  </>
                )}
              </p>
            )}
          </>
        )}
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Reported by {from.name} (exports)</dt>
            <dd className="tabular text-end font-medium text-heading">{money(own) ?? 'Not reported'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Reported by {to.name} (imports)</dt>
            <dd className="tabular text-end font-medium text-heading">{money(mirror) ?? 'Not reported'}</dd>
          </div>
        </dl>
        {gap !== null && gap > 0.1 && (
          <p className="mt-3 text-xs leading-relaxed text-muted">The two reports differ by {formatPercent(gap * 100, locale, 0)}. That is common: imports are usually valued with freight and insurance, and timing, re-exports and classification differ.</p>
        )}
      </article>
    </Reveal>
  );
}

function SectorList({ country, file }: { country: Country; file: TradePartnersFile | null }) {
  const { locale } = useI18n();
  if (!file) return <p className="text-sm text-muted">No {country.name} sector data in this snapshot.</p>;
  const rows = sectorRows(file, 'exports').slice(0, 4);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.id} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-heading">{r.label}</span>
          <span className="tabular text-xs text-muted">{formatPercent(r.share * 100, locale, 0)}</span>
        </li>
      ))}
    </ul>
  );
}

function PairResult({ a, b }: { a: Country; b: Country }) {
  const { locale } = useI18n();
  const index = useDataset('trade-index');
  const loaded = useAsync(`pair:${a.cca3}:${b.cca3}:${index.status}`, async () => {
    if (!index.data) return null;
    const get = async (c: Country) => (index.data!.reporters.includes(c.cca3) ? loadPartners(c.cca3) : null);
    const [fa, fb] = await Promise.all([get(a), get(b)]);
    return { fa, fb };
  });

  if (index.status === 'error') return <ErrorState error={index.error} onRetry={index.reload} />;
  if (index.status === 'loading' || loaded.status === 'loading') return <LoadingBlock lines={6} label="Loading trade data" />;
  if (loaded.status === 'error') return <ErrorState error={loaded.error} onRetry={loaded.reload} />;
  const { fa, fb } = loaded.data!;
  const year = index.data!.year;

  if (!fa && !fb) {
    return (
      <EmptyState
        icon={Info}
        title={`WITS has no ${year} goods-trade report from ${a.name} or ${b.name}`}
        description={
          <>
            Without either country’s report there is nothing to show, and eport does not estimate. Try another pair, or search the{' '}
            <ExternalLink href="https://comtradeplus.un.org/">UN Comtrade</ExternalLink> database directly.
          </>
        }
      />
    );
  }

  const report = fa && fb ? pairReport(fa, fb) : null;
  const balance = report ? balanceFor(report) : null;
  const money = (v: number) => formatUsdCompact(toUsd(Math.abs(v)), locale);

  return (
    <div className="space-y-8">
      {(!fa || !fb) && (
        <p role="note" className="flex gap-3 rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm leading-relaxed text-ink">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warn" />
          <span>
            <strong className="font-semibold text-heading">{(!fa ? a : b).name} has no {year} report in WITS.</strong> Figures for this pair come only from {(fa ? a : b).name}’s own report, so one direction may
            show a mirror value and the other none.
          </span>
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <FlowCard from={a} to={b} exporter={fa} importer={fb} delay={0} />
        <FlowCard from={b} to={a} exporter={fb} importer={fa} delay={90} />
      </div>

      {balance !== null && (
        <Reveal>
          <div className="rounded-2xl border border-line bg-soft p-6">
            <h3 className="text-base font-bold">Bilateral balance</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              Using each country’s own export report, {balance === 0 ? 'trade between the two is balanced' : `${balance > 0 ? a.name : b.name} exported ${money(balance)} more to ${balance > 0 ? b.name : a.name} than it received in return`} in {year}.
            </p>
            <p className="mt-2 text-xs text-muted">A balance in goods is not a measure of overall economic benefit, and excludes services.</p>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="grid gap-5 md:grid-cols-2">
          {[a, b].map((c, i) => (
            <div key={c.cca2} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Flag code={c.cca2} /> {c.name}: main export sectors
              </h3>
              <p className="mt-1 mb-4 text-xs text-muted">All of {c.name}’s goods exports, not only to {(i === 0 ? b : a).name}.</p>
              <SectorList country={c} file={i === 0 ? fa : fb} />
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-base font-bold">Where to look next</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {[a, b].map((c) => (
              <li key={c.cca2} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <Flag code={c.cca2} />
                <span className="text-sm">
                  <Link to={`/countries/${c.cca2}`} className="font-semibold text-heading hover:text-link">
                    {c.name} country profile
                  </Link>
                  <span className="block text-xs text-muted">Indicators, process guide, authorities and working days</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Trade agreements, tariffs and port connections between these two countries are not published on eport yet. Check each country’s customs administration and the WTO before you ship.
          </p>
        </div>
      </Reveal>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
        <Badge tone="neutral">Historical annual statistics · goods only · {year}</Badge>
        <span>
          Source: <ExternalLink href="https://wits.worldbank.org/">World Bank WITS</ExternalLink> (from UN Comtrade), CC BY 4.0 · retrieved {formatDate(index.data!.retrievedOn, locale)}
        </span>
      </p>
    </div>
  );
}

export default function TradeExplorerPage() {
  const params = useParams();
  const navigate = useNavigate();
  const meta = routeMeta('/trade');
  const countries = useDataset('countries');
  const index = useDataset('trade-index');

  const a = countries.data?.find((c) => c.cca2 === (params.a ?? '').toUpperCase());
  const b = countries.data?.find((c) => c.cca2 === (params.b ?? '').toUpperCase());
  const hasPair = Boolean(params.a && params.b);

  useSeo({
    title: a && b ? `Trade between ${a.name} and ${b.name}` : meta.title,
    description: a && b ? `Goods trade between ${a.name} and ${b.name} in both directions, from World Bank WITS.` : meta.description,
    path: a && b ? `/trade/${a.cca2}/${b.cca2}` : '/trade',
    breadcrumbs: seoCrumbs(CRUMBS, '/trade'),
    noindex: hasPair,
  });

  const sorted = useMemo(() => [...(countries.data ?? [])].sort((x, y) => x.name.localeCompare(y.name)), [countries.data]);
  const covered = new Set(index.data?.reporters ?? []);
  const go = (from: string, to: string) => from && to && navigate(`/trade/${from}/${to}`, { replace: true });

  const select = (label: string, value: string, onChange: (v: string) => void, id: string) => (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-heading">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {sorted.find((c) => c.cca2 === value) && <Flag code={value} className="!h-6 !w-8" />}
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, 'min-h-12')}>
          <option value="">Choose a country…</option>
          {sorted.map((c) => (
            <option key={c.cca2} value={c.cca2}>
              {c.name}
              {covered.size > 0 && !covered.has(c.cca3) ? ' (no 2023 report)' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        crumbs={CRUMBS}
        kicker="eport Intelligence"
        title="Trade Explorer"
        description="Pick any two countries to see goods trade between them in both directions — each side’s own report, the gaps between them, and where to look next."
      />
      <div className="container-page py-10">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_-40px_rgb(11_31_51/0.4)] sm:p-6">
          <form role="search" aria-label="Choose two countries" onSubmit={(e) => e.preventDefault()} className="flex flex-col items-stretch gap-4 md:flex-row md:items-end">
            {select('From', a?.cca2 ?? '', (v) => go(v, b?.cca2 ?? ''), 'from')}
            <Button variant="secondary" size="md" className="self-center md:mb-0.5" aria-label="Swap the two countries" disabled={!a || !b} onClick={() => a && b && go(b.cca2, a.cca2)}>
              <ArrowLeftRight aria-hidden="true" className="size-4" />
            </Button>
            {select('To', b?.cca2 ?? '', (v) => go(a?.cca2 ?? '', v), 'to')}
          </form>
          <p className="mt-3 text-xs text-muted">
            {index.data ? `${index.data.reporters.length} countries have a ${index.data.year} goods-trade report in WITS. ` : ''}Countries marked “no report” can still appear through their partner’s report.
          </p>
        </div>

        <div className="mt-8" aria-live="polite">
          {countries.status === 'error' && <ErrorState error={countries.error} onRetry={countries.reload} />}
          {countries.status === 'loading' && <LoadingBlock lines={5} />}
          {countries.status === 'ready' && hasPair && (!a || !b) && (
            <EmptyState title="That country code is not recognised" description="Use the selectors above. eport uses ISO 3166-1 alpha-2 codes in these addresses, for example /trade/IN/DE." />
          )}
          {a && b && a.cca2 === b.cca2 && <EmptyState title="Choose two different countries" description="A country’s trade with itself is not goods trade." />}
          {a && b && a.cca2 !== b.cca2 && <PairResult a={a} b={b} />}
          {countries.status === 'ready' && !hasPair && (
            <EmptyState
              icon={ArrowLeftRight}
              title="Choose two countries to begin"
              description={
                <>
                  Try{' '}
                  {[
                    ['US', 'CN'],
                    ['DE', 'FR'],
                    ['IN', 'AE'],
                    ['BR', 'CN'],
                    ['JP', 'KR'],
                  ].map(([x, y], i) => (
                    <span key={x}>
                      {i > 0 && ', '}
                      <Link className="link" to={`/trade/${x}/${y}`}>
                        {x}–{y}
                      </Link>
                    </span>
                  ))}
                  .
                </>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
