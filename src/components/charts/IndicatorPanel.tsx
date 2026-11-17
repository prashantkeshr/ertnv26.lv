/**
 * Trade and economic indicators for one economy (or the world aggregate "WLD").
 *
 * Every figure is a historical annual statistic from the World Bank snapshot and is shown
 * with its observation year, unit, source, the source's own update date and the date eport
 * retrieved it. Nothing is estimated or filled in by eport.
 */
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/common/StatusBadge';
import { ExternalLink } from '@/components/common/primitives';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useAsync, useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { loadIndicators } from '@/services/data/loader';
import type { IndicatorSeries } from '@/types/schemas';
import { formatDate, formatPercent, formatUsdAxis, formatUsdCompact, percentChange } from '@/utils/format';
import { LineChart } from './LineChart';

function latest(series: IndicatorSeries | undefined) {
  if (!series?.points.length) return null;
  const last = series.points[series.points.length - 1]!;
  const prev = series.points.find((p) => p.year === last.year - 1);
  return { ...last, change: percentChange(last.value, prev?.value) };
}

function Stat({ series, locale }: { series: IndicatorSeries; locale: string }) {
  const point = latest(series);
  const value = point ? (series.unit === 'current-usd' ? formatUsdCompact(point.value, locale) : formatPercent(point.value, locale)) : null;
  return (
    <div className="border-s-2 border-line ps-4">
      <dt className="text-sm leading-snug text-muted">{series.name}</dt>
      <dd className="mt-1.5">
        {point ? (
          <>
            <span className="tabular font-display text-2xl font-bold text-heading">{value}</span>
            <span className="tabular mt-1 block text-xs text-muted">
              {point.year}
              {point.change !== null && series.unit === 'current-usd' && (
                <>
                  {' · '}
                  {point.change >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(point.change), locale)} vs {point.year - 1}
                </>
              )}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted">No data published</span>
        )}
      </dd>
    </div>
  );
}

interface IndicatorPanelProps {
  /** ISO alpha-3, or "WLD" for the world aggregate. */
  areaCode: string;
  areaName: string;
  showChart?: boolean;
}

export function IndicatorPanel({ areaCode, areaName, showChart = true }: IndicatorPanelProps) {
  const { locale } = useI18n();
  const index = useDataset('indicator-index');
  const covered = index.data?.areas.includes(areaCode) ?? false;
  const file = useAsync(`indicators:${areaCode}:${covered}`, async () => (covered ? loadIndicators(areaCode) : null));

  if (index.status === 'loading' || (covered && file.status === 'loading')) return <LoadingBlock lines={5} label="Loading indicators" />;
  if (index.status === 'error') return <ErrorState error={index.error} onRetry={index.reload} />;
  if (file.status === 'error') return <ErrorState error={file.error} onRetry={file.reload} />;

  if (!covered || !file.data) {
    return (
      <EmptyState
        icon={BarChart3}
        title={`No World Bank indicators are published for ${areaName}`}
        description="The source does not report these indicators for this economy. eport does not estimate missing statistics."
      />
    );
  }

  const data = file.data;
  const byId = (id: string) => data.series.find((s) => s.indicatorId === id);
  const exports = byId('NE.EXP.GNFS.CD');
  const imports = byId('NE.IMP.GNFS.CD');
  const chartSeries = [exports, imports].filter((s): s is IndicatorSeries => Boolean(s && s.points.length > 1));
  const period = index.data!.period;

  return (
    <div>
      <dl className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {index.data!.indicators.map((meta) => {
          const s = byId(meta.indicatorId);
          return <Stat key={meta.indicatorId} locale={locale} series={s ?? { ...meta, points: [] }} />;
        })}
      </dl>

      {showChart && chartSeries.length > 0 && (
        <div className="mt-8 rounded-lg border border-line bg-surface p-4 sm:p-6">
          <h3 className="mb-4 text-base font-bold">
            {areaName}: exports and imports of goods and services, {period.from}–{period.to} <span className="font-sans text-sm font-normal text-muted">(current US$)</span>
          </h3>
          <LineChart
            series={chartSeries.map((s) => ({ id: s.indicatorId, label: s.indicatorId === 'NE.EXP.GNFS.CD' ? 'Exports' : 'Imports', points: s.points }))}
            formatAxis={(v) => (v === 0 ? '0' : `$${formatUsdAxis(v, locale)}`)}
            formatValue={(v) => formatUsdCompact(v, locale)}
            summary={`Line chart of ${areaName} exports and imports of goods and services in current US dollars, ${period.from} to ${period.to}. Source: World Bank.`}
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
        <Badge tone="neutral">Historical annual statistics</Badge>
        <span>
          Source: <ExternalLink href="https://data.worldbank.org/">World Bank, World Development Indicators</ExternalLink> (CC BY 4.0)
        </span>
        <span>· Source updated {formatDate(data.sourceLastUpdated, locale)}</span>
        <span>· Retrieved by eport {formatDate(data.retrievedOn, locale)}</span>
        <Link to="/data-reliability" className="link">
          Coverage and limits
        </Link>
      </div>
    </div>
  );
}
