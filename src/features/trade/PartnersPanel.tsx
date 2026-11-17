/**
 * "Trade partners and sectors" for a country, from the World Bank WITS snapshot (2023,
 * merchandise goods, as reported by the country itself). Works for any country WITS covers;
 * says plainly when it does not.
 */
import { ArrowUpRight, Globe2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Flag } from '@/components/common/Flag';
import { cn, ExternalLink } from '@/components/common/primitives';
import { Badge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useAsync, useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { loadPartners } from '@/services/data/loader';
import type { Country } from '@/types/schemas';
import type { Flow } from '@/services/api/providers/wits';
import { formatDate, formatPercent, formatUsdCompact } from '@/utils/format';
import { flowTotal, sectorRows, toUsd, topPartners } from './tradeMath';

const FLOWS: Array<[Flow, string]> = [
  ['exports', 'Exports'],
  ['imports', 'Imports'],
];

function Bar({ share, tone = 'link' }: { share: number; tone?: 'link' | 'aurora' }) {
  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-line">
      <span className={cn('block h-full rounded-full', tone === 'link' ? 'bg-link' : 'bg-accent')} style={{ width: `${Math.max(1.5, Math.min(100, share * 100))}%` }} />
    </span>
  );
}

export function PartnersPanel({ country, allCountries }: { country: Country; allCountries: Country[] }) {
  const { locale } = useI18n();
  const index = useDataset('trade-index');
  const covered = index.data?.reporters.includes(country.cca3) ?? false;
  const file = useAsync(`partners:${country.cca3}:${covered}`, async () => (covered ? loadPartners(country.cca3) : null));
  const [flow, setFlow] = useState<Flow>('exports');
  const byIso3 = new Map(allCountries.map((c) => [c.cca3, c]));

  if (index.status === 'loading' || (covered && file.status === 'loading')) return <LoadingBlock lines={6} label="Loading trade partners" />;
  if (index.status === 'error') return <ErrorState error={index.error} onRetry={index.reload} />;
  if (file.status === 'error') return <ErrorState error={file.error} onRetry={file.reload} />;
  if (!covered || !file.data) {
    return (
      <EmptyState
        icon={Globe2}
        title={`No ${index.data?.year ?? 2023} merchandise trade record for ${country.name} in WITS`}
        description={
          <>
            WITS only carries data a country has reported to the UN statistics division, and some countries — or territories — have not reported for {index.data?.year ?? 2023}. eport does not estimate it. Partner
            countries’ own reports of trade with {country.name} may exist; explore them in the{' '}
            <Link to="/trade" className="link">
              Trade Explorer
            </Link>
            , or see the <ExternalLink href="https://comtradeplus.un.org/">UN Comtrade</ExternalLink> database.
          </>
        }
      />
    );
  }

  const data = file.data;
  const partners = topPartners(data, flow, 10);
  const sectors = sectorRows(data, flow).slice(0, 6);
  const total = flowTotal(data, flow);
  const other = Math.max(0, total - partners.reduce((s, p) => s + p.value, 0));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Choose exports or imports" className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
          {FLOWS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={flow === value}
              onClick={() => setFlow(value)}
              className={cn('min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors', flow === value ? 'bg-ocean text-white shadow' : 'text-ink hover:bg-soft')}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          <span className="tabular font-display text-xl font-bold text-heading">{formatUsdCompact(toUsd(total), locale)}</span> of goods {flow === 'exports' ? 'exported' : 'imported'} in {data.year}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <section aria-labelledby={`partners-${flow}`} className="rounded-2xl border border-line bg-surface p-5">
          <h3 id={`partners-${flow}`} className="text-base font-bold">
            Top {flow === 'exports' ? 'destinations' : 'sources'}
          </h3>
          <ol className="mt-4 space-y-3.5">
            {partners.map((p, i) => {
              const c = byIso3.get(p.code);
              return (
                <li key={p.code}>
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="tabular w-5 text-xs text-muted">
                      {i + 1}
                    </span>
                    {c && <Flag code={c.cca2} />}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">
                      {c ? (
                        <Link to={flow === 'exports' ? `/trade/${country.cca2}/${c.cca2}` : `/trade/${c.cca2}/${country.cca2}`} className="hover:text-link hover:underline">
                          {c.name}
                          <span className="sr-only"> — open in the Trade Explorer</span>
                        </Link>
                      ) : (
                        p.code
                      )}
                    </span>
                    <span className="tabular text-sm text-ink">{formatUsdCompact(toUsd(p.value), locale)}</span>
                    <span className="tabular w-12 text-end text-xs text-muted">{formatPercent(p.share * 100, locale, 1)}</span>
                  </div>
                  <div className="mt-1.5 ps-8">
                    <Bar share={p.share / (partners[0]?.share || 1)} />
                  </div>
                </li>
              );
            })}
          </ol>
          {other > 0 && (
            <p className="tabular mt-4 border-t border-line pt-3 text-xs text-muted">
              All other partners: {formatUsdCompact(toUsd(other), locale)} ({formatPercent((other / total) * 100, locale, 1)})
            </p>
          )}
        </section>

        <section aria-labelledby={`sectors-${flow}`} className="rounded-2xl border border-line bg-surface p-5">
          <h3 id={`sectors-${flow}`} className="text-base font-bold">
            Main sectors
          </h3>
          <ul className="mt-4 space-y-3.5">
            {sectors.map((s) => (
              <li key={s.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-heading">{s.label}</span>
                  <span className="tabular text-xs text-muted">
                    {formatUsdCompact(toUsd(s.value), locale)} · {formatPercent(s.share * 100, locale, 1)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar share={s.share / (sectors[0]?.share || 1)} tone="aurora" />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">Sectors are the 16 sections of the Harmonized System. Shares are of the goods total.</p>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
        <Badge tone="neutral">Historical annual statistics · goods only</Badge>
        <span>
          Source: <ExternalLink href="https://wits.worldbank.org/">World Bank WITS</ExternalLink>, from UN Comtrade, as reported by {country.name} · retrieved {formatDate(data.retrievedOn, locale)}
        </span>
        <Link to={`/trade`} className="inline-flex items-center gap-1 font-semibold text-link hover:text-link-hover">
          Compare with another country <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
