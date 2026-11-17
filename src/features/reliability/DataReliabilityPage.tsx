/**
 * Data Reliability Centre.
 *
 * Nothing on this page is written by hand: dataset counts come from the build manifest,
 * API results from the provider registry, link results from the last link check, and
 * module availability from the platform registry. If eport's coverage is thin somewhere,
 * this page is where that shows.
 */
import { Check, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { allModules, type ModuleStatus } from '@/app/modules';
import { routeMeta } from '@/app/route-meta';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { cn, ExternalLink, hostOf } from '@/components/common/primitives';
import { Badge, CoverageBadge, ModuleStatusBadge, VerificationBadge, type Tone } from '@/components/common/StatusBadge';
import { ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import type { ApiProvider, DatasetCoverage, VerificationStatus } from '@/types/schemas';
import { formatDate, formatNumber } from '@/utils/format';
import { INTEGRATION_LABEL } from '@/utils/labels';

const CRUMBS = [{ label: 'Data Reliability Centre' }];
const COVERAGE_ORDER: DatasetCoverage[] = ['verified', 'partial', 'seed', 'unavailable'];
const COVERAGE_MEANING: Record<DatasetCoverage, string> = {
  verified: 'Complete for its stated scope and taken from an authoritative or openly licensed source.',
  partial: 'Accurate for what it contains, but known not to cover the whole scope.',
  seed: 'A first, deliberately small set used to prove the structure. Expect gaps.',
  unavailable: 'Not published. eport shows nothing rather than unverified content.',
};
const INTEGRATION_TONE: Record<ApiProvider['integrationStatus'], Tone> = {
  integrated: 'ok',
  'build-time-snapshot': 'info',
  'approved-planned': 'neutral',
  'coming-soon-secure-layer': 'warn',
  'external-link-only': 'neutral',
};
const ACCESS: Record<ApiProvider['browserAccess'], { tone: Tone; label: string }> = {
  verified: { tone: 'ok', label: 'Browser access verified' },
  failed: { tone: 'bad', label: 'Browser access blocked' },
  'not-tested': { tone: 'neutral', label: 'Browser access not tested' },
};

function Block({ id, title, intro, children }: { id: string; title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-12 first:border-t-0 first:pt-0">
      <h2 id={id} className="text-2xl font-bold">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{intro}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Async({ state, children }: { state: { status: string; error?: Error; reload: () => void }; children: () => ReactNode }) {
  if (state.status === 'loading') return <LoadingBlock lines={4} />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={state.reload} />;
  return <>{children()}</>;
}

export default function DataReliabilityPage() {
  const meta = routeMeta('/data-reliability');
  useSeo({ title: meta.title, description: meta.description, path: '/data-reliability', breadcrumbs: seoCrumbs(CRUMBS, '/data-reliability') });
  const { locale } = useI18n();
  const manifest = useDataset('manifest');
  const sources = useDataset('sources');
  const providers = useDataset('api-providers');
  const links = useDataset('link-status');
  const coverage = useDataset('coverage');
  const countries = useDataset('countries');
  const organizations = useDataset('organizations');
  const authorities = useDataset('authorities-in');
  const [filter, setFilter] = useState<DatasetCoverage | ''>('');

  const publisher = (id: string) => sources.data?.find((s) => s.id === id)?.publisher ?? id;
  const datasets = manifest.data?.datasets ?? [];
  const shown = filter ? datasets.filter((d) => d.coverage === filter) : datasets;

  const records = [
    ...(organizations.data ?? []).map((o) => ({ ...o, path: `/directory/organizations/${o.id}` })),
    ...(authorities.data ?? []).map((a) => ({ ...a, path: `/directory/authorities/${a.id}` })),
  ];
  const byStatus = (s: VerificationStatus) => records.filter((r) => r.verification.status === s);
  const linkEntries = Object.entries(links.data?.results ?? {});
  const failedLinks = linkEntries.filter(([, r]) => !r.ok);
  const modules = allModules();
  const moduleCount = (s: ModuleStatus) => modules.filter((m) => m.status === s).length;
  const guided = Object.entries(coverage.data?.countries ?? {});

  return (
    <>
      <PageHeader
        crumbs={CRUMBS}
        kicker="Transparency"
        title="Data Reliability Centre"
        description="Exactly what eport covers today, how well, from which sources — and what it does not cover yet. Counts on this page are generated from the published data, not written by hand."
      >
        {manifest.data && <Badge tone="neutral">Data build {formatDate(manifest.data.generatedAt, locale)}</Badge>}
      </PageHeader>

      <div className="container-page py-12">
        <Block
          id="datasets-heading"
          title="Datasets"
          intro="Every dataset eport publishes or plans to publish. “Not available yet” rows are listed on purpose, so a missing answer is never mistaken for “nothing applies”."
        >
          <Async state={manifest}>
            {() => (
              <>
                <div role="group" aria-label="Filter datasets by coverage" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {COVERAGE_ORDER.map((c) => {
                    const n = datasets.filter((d) => d.coverage === c).length;
                    const active = filter === c;
                    return (
                      <button key={c} type="button" aria-pressed={active} onClick={() => setFilter(active ? '' : c)} className={cn('rounded-lg border p-4 text-left transition-colors', active ? 'border-navy bg-soft' : 'border-line bg-white hover:border-ocean')}>
                        <span className="flex items-center justify-between">
                          <CoverageBadge coverage={c} />
                          <span className="tabular font-display text-2xl font-bold text-navy">{n}</span>
                        </span>
                        <span className="mt-2 block text-xs leading-relaxed text-muted">{COVERAGE_MEANING[c]}</span>
                      </button>
                    );
                  })}
                </div>
                <p role="status" className="mb-3 text-sm text-muted">
                  Showing {shown.length} of {datasets.length} datasets{filter && ' — select the highlighted card again to clear the filter'}.
                </p>
                <div role="region" aria-label="Datasets table, scrollable" tabIndex={0} className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[46rem] text-sm">
                    <caption className="sr-only">eport datasets with coverage status, record count, last update and sources</caption>
                    <thead className="bg-soft text-left text-xs tracking-wide text-muted uppercase">
                      <tr>
                        {['Dataset', 'Coverage', 'Records', 'Updated', 'Source'].map((h) => (
                          <th key={h} scope="col" className={cn('px-4 py-3 font-semibold', h === 'Records' && 'text-right')}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((d) => (
                        <tr key={d.id} className="border-t border-line align-top">
                          <th scope="row" className="max-w-sm px-4 py-3 text-left font-normal">
                            <span className="font-semibold text-navy">{d.title}</span>
                            <span className="mt-0.5 block text-xs text-muted">{d.scope}</span>
                            <span className="mt-1.5 block text-xs leading-relaxed text-ink">{d.notes}</span>
                          </th>
                          <td className="px-4 py-3">
                            <CoverageBadge coverage={d.coverage} />
                            {!d.path && <span className="mt-1.5 block text-xs text-muted">Planned: phase {d.phase}</span>}
                          </td>
                          <td className="tabular px-4 py-3 text-right text-ink">{d.records === null ? '—' : formatNumber(d.records, locale)}</td>
                          <td className="tabular px-4 py-3 whitespace-nowrap text-ink">{d.lastUpdated ? formatDate(d.lastUpdated, locale) : '—'}</td>
                          <td className="px-4 py-3 text-xs leading-relaxed text-ink">
                            {d.sourceIds.length === 0
                              ? d.path
                                ? 'Maintained or derived by eport'
                                : 'To be determined'
                              : d.sourceIds.length > 3
                                ? `${d.sourceIds.length} official sources`
                                : d.sourceIds.map(publisher).join('; ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Async>
        </Block>

        <Block
          id="apis-heading"
          title="External data services"
          intro="Each service was tested with a real cross-origin request before any decision. A service that needs a secret key or blocks browsers is never worked around: it is marked Coming Soon and eport links to the official site instead."
        >
          <Async state={providers}>
            {() => (
              <ul className="grid gap-4 lg:grid-cols-2">
                {providers.data!.map((p) => (
                  <li key={p.id} className="rounded-lg border border-line bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-base font-bold">{p.name}</h3>
                      <Badge tone={INTEGRATION_TONE[p.integrationStatus]}>{INTEGRATION_LABEL[p.integrationStatus]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {p.operator} · {p.dataKind}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Badge tone={ACCESS[p.browserAccess].tone} icon={p.browserAccess === 'verified' ? Check : p.browserAccess === 'failed' ? X : undefined}>
                        {ACCESS[p.browserAccess].label}
                      </Badge>
                      {p.browserAccessCheckedOn && <span>tested {formatDate(p.browserAccessCheckedOn, locale)}</span>}
                      <span>· {p.auth === 'none' ? 'No credentials needed' : p.auth === 'api-key' ? 'Requires a secret API key' : 'Requires membership'}</span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink">{p.browserAccessNote}</p>
                    <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                      {[
                        ['Coverage', p.coverage],
                        ['Freshness', p.freshness],
                        ['Licence', p.license],
                        ['Used for', p.usedBy.length ? p.usedBy.join('; ') : 'Not used'],
                      ].map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-3">
                          <dt className="text-muted">{k}</dt>
                          <dd className="text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-4 text-sm">
                      <ExternalLink href={p.docsUrl}>Official documentation</ExternalLink>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Async>
        </Block>

        <Block
          id="records-heading"
          title="Authority and organization records"
          intro="“Source referenced” means the record links to the body's official website and that link was confirmed reachable. It does not mean the body has reviewed eport's summary. “Reviewed against official source” is reserved for an editorial review."
        >
          <Async state={organizations.status === 'ready' ? authorities : organizations}>
            {() => (
              <>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(['officially-verified', 'source-referenced', 'needs-review', 'outdated'] as VerificationStatus[]).map((s) => (
                    <li key={s} className="flex items-center justify-between rounded-lg border border-line p-4">
                      <VerificationBadge status={s} />
                      <span className="tabular font-display text-2xl font-bold text-navy">{byStatus(s).length}</span>
                    </li>
                  ))}
                </ul>
                {byStatus('needs-review').length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-navy">Records needing review</h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {byStatus('needs-review').map((r) => (
                        <li key={r.id}>
                          <Link to={r.path} className="link">
                            {r.name}
                          </Link>
                          {r.verification.note && <span className="text-muted"> — {r.verification.note}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Async>
        </Block>

        <Block id="links-heading" title="Official link check" intro="An automated check requests every official link eport publishes. A link that fails is flagged here and on the record itself rather than silently kept.">
          {links.status === 'loading' && <LoadingBlock lines={2} />}
          {links.status === 'error' && <p className="text-sm text-muted">No link check has been recorded for this build.</p>}
          {links.data && (
            <>
              <p className="text-sm text-ink">
                <span className="tabular font-display text-2xl font-bold text-navy">
                  {linkEntries.length - failedLinks.length} of {linkEntries.length}
                </span>{' '}
                official links were reachable{links.data.checkedAt && <> on {formatDate(links.data.checkedAt, locale)}</>}.
              </p>
              {failedLinks.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {failedLinks.map(([url, r]) => (
                    <li key={url} className="flex flex-wrap items-center gap-2">
                      <Badge tone="warn" icon={X}>
                        No response
                      </Badge>
                      <span className="text-ink">{hostOf(url)}</span>
                      <span className="text-muted">{r.httpStatus ? `HTTP ${r.httpStatus}` : 'connection failed'} — the site may be down or may block automated checks</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Block>

        <Block
          id="countries-heading"
          title="Country coverage"
          intro="All countries have a reference record. Operational guidance — procedures, documents and product rules — is researched one market at a time, starting with India."
        >
          <Async state={coverage.status === 'ready' ? countries : coverage}>
            {() => (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-line p-5">
                  <p className="tabular font-display text-3xl font-bold text-navy">{guided.length}</p>
                  <p className="mt-1 text-sm text-muted">market with operational guidance in progress</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {guided.map(([code, entry]) => (
                      <li key={code}>
                        <Link to={`/countries/${code}`} className="link font-medium">
                          {countries.data!.find((c) => c.cca2 === code)?.name ?? code}
                        </Link>
                        <span className="text-muted">
                          {' '}
                          — {entry.available.length} areas published, {entry.pending.length} being researched
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-line p-5">
                  <p className="tabular font-display text-3xl font-bold text-navy">{countries.data!.length - guided.length}</p>
                  <p className="mt-1 text-sm text-muted">countries and territories with a reference record only</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink">Identifiers, indicators where the World Bank reports them, and a reference exchange rate where the currency is covered. No trade rules.</p>
                </div>
              </div>
            )}
          </Async>
        </Block>

        <Block id="modules-heading" title="Feature availability" intro="Every module in the platform plan with its real status. “Coming Soon” is used only for things that genuinely cannot run on a static, backend-free website.">
          <ul className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {(['live', 'foundation', 'planned', 'requires-backend'] as ModuleStatus[]).map((s) => (
              <li key={s} className="flex items-center gap-2">
                <ModuleStatusBadge status={s} />
                <span className="tabular font-semibold text-navy">{moduleCount(s)}</span>
              </li>
            ))}
          </ul>
          <div role="region" aria-label="Feature availability table, scrollable" tabIndex={0} className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">All eport modules with division, status and phase</caption>
              <thead className="bg-soft text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  {['Module', 'Division', 'Status', 'Phase'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={`${m.division}-${m.id}`} className="border-t border-line align-top">
                    <th scope="row" className="px-4 py-2.5 text-left font-normal">
                      {m.path ? (
                        <Link to={m.path} className="link font-medium">
                          {m.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-navy">{m.title}</span>
                      )}
                      {m.note && <span className="mt-0.5 block max-w-md text-xs leading-relaxed text-muted">{m.note}</span>}
                    </th>
                    <td className="px-4 py-2.5 text-ink">{m.division}</td>
                    <td className="px-4 py-2.5">
                      <ModuleStatusBadge status={m.status} />
                    </td>
                    <td className="tabular px-4 py-2.5 text-ink">{m.phase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      </div>
    </>
  );
}
