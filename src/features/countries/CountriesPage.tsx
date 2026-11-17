import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { routeMeta } from '@/app/route-meta';
import { Flag } from '@/components/common/Flag';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { Button, inputClass } from '@/components/common/primitives';
import { CountryLevelBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import type { Country } from '@/types/schemas';
import { formatNumber } from '@/utils/format';

const PAGE_SIZE = 50;
const CRUMBS = [{ label: 'Countries' }];

function matches(c: Country, q: string): boolean {
  if (!q) return true;
  const hay = [c.name, c.officialName, c.cca2, c.cca3, ...c.capital, ...c.currencies.map((x) => x.code)].join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export default function CountriesPage() {
  const meta = routeMeta('/countries');
  useSeo({ title: meta.title, description: meta.description, path: '/countries', breadcrumbs: seoCrumbs(CRUMBS, '/countries') });
  const { locale } = useI18n();
  const countries = useDataset('countries');
  const coverage = useDataset('coverage');
  const [params, setParams] = useSearchParams();
  const [visible, setVisible] = useState(PAGE_SIZE);

  const q = params.get('q') ?? '';
  const region = params.get('region') ?? '';
  const depth = params.get('coverage') ?? '';

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setVisible(PAGE_SIZE);
  }

  const regions = useMemo(() => [...new Set(countries.data?.map((c) => c.region) ?? [])].sort(), [countries.data]);
  const levelOf = (c: Country) => coverage.data?.countries[c.cca2]?.level ?? coverage.data?.defaultLevel ?? 'reference';
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (countries.data ?? []).filter((c) => matches(c, needle) && (!region || c.region === region) && (!depth || (depth === 'guidance') === (levelOf(c) !== 'reference')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries.data, coverage.data, q, region, depth]);

  const error = countries.error ?? coverage.error;
  const loading = countries.status === 'loading' || coverage.status === 'loading';

  return (
    <>
      <PageHeader
        crumbs={CRUMBS}
        kicker="eport Intelligence"
        title="Country Explorer"
        description="Every country and territory with an ISO 3166-1 code. Each profile shows identifiers, sourced trade indicators and the authorities eport has linked to it."
      />
      <div className="container-page py-10">
        <form role="search" aria-label="Filter countries" onSubmit={(e) => e.preventDefault()} className="grid gap-4 rounded-lg border border-line bg-soft p-4 sm:grid-cols-[1fr_12rem_14rem]">
          <label className="block text-sm font-medium text-heading">
            Name, capital, ISO or currency code
            <input type="search" value={q} onChange={(e) => update('q', e.target.value)} placeholder="e.g. India, IN, IND, Nairobi, EUR" className={`${inputClass} mt-1.5`} autoComplete="off" />
          </label>
          <label className="block text-sm font-medium text-heading">
            Region
            <select value={region} onChange={(e) => update('region', e.target.value)} className={`${inputClass} mt-1.5`}>
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-heading">
            eport coverage
            <select value={depth} onChange={(e) => update('coverage', e.target.value)} className={`${inputClass} mt-1.5`}>
              <option value="">Any coverage</option>
              <option value="guidance">Operational guidance</option>
              <option value="reference">Reference record only</option>
            </select>
          </label>
        </form>

        <div className="mt-6">
          {error && <ErrorState error={error} onRetry={() => (countries.reload(), coverage.reload())} />}
          {!error && loading && <LoadingBlock lines={8} />}
          {!error && !loading && (
            <>
              <p role="status" className="tabular mb-3 text-sm text-muted">
                {formatNumber(filtered.length, locale)} of {formatNumber(countries.data!.length, locale)} countries and territories
              </p>
              {filtered.length === 0 ? (
                <EmptyState
                  title="No country matches these filters"
                  description="Check the spelling, try an ISO code such as IN or IND, or clear the filters."
                  action={
                    <Button variant="secondary" onClick={() => (setParams({}, { replace: true }), setVisible(PAGE_SIZE))}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-line">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Countries and territories matching the current filters</caption>
                    <thead className="bg-soft text-left text-xs tracking-wide text-muted uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Country or territory
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          ISO codes
                        </th>
                        <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">
                          Region
                        </th>
                        <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">
                          Currency
                        </th>
                        <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                          eport coverage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, visible).map((c) => (
                        <tr key={c.id} className="border-t border-line hover:bg-soft">
                          <th scope="row" className="px-4 py-3 text-left font-normal">
                            <span className="flex items-center gap-2.5">
                              <Flag code={c.cca2} />
                              <Link to={`/countries/${c.cca2}`} className="font-semibold text-heading hover:text-link hover:underline">
                                {c.name}
                              </Link>
                            </span>
                            {c.capital[0] && <span className="block text-xs text-muted">{c.capital[0]}</span>}
                          </th>
                          <td className="tabular px-4 py-3 whitespace-nowrap text-ink">
                            {c.cca2} · {c.cca3}
                          </td>
                          <td className="hidden px-4 py-3 text-ink md:table-cell">{c.subregion ?? c.region}</td>
                          <td className="hidden px-4 py-3 text-ink lg:table-cell">{c.currencies.map((x) => x.code).join(', ') || '—'}</td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <CountryLevelBadge level={levelOf(c)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {filtered.length > visible && (
                <div className="mt-5 text-center">
                  <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
