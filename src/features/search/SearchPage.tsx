/**
 * Search results template.
 *
 *  - "Top match": a rich card for the best eport record (country, authority, organization, tool).
 *  - "On eport": ranked results from eport's published records, filterable by type.
 *  - "From the web — live": encyclopedia articles (Wikipedia) and news headlines (GDELT) fetched
 *    by the visitor's browser. Unverified, labelled, and switchable off.
 *
 * eport's own records are always shown first and are never mixed with web results.
 */
import { ArrowRight, Globe2, Newspaper, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { routeMeta } from '@/app/route-meta';
import { Flag } from '@/components/common/Flag';
import { PageHeader } from '@/components/common/PageHeader';
import { Button, cn } from '@/components/common/primitives';
import { Badge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { Highlight, SearchCombobox } from '@/components/search/SearchCombobox';
import { LiveHeadlines } from '@/features/news/LiveHeadlines';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { loadSearchEngine, type SearchResult } from '@/services/search/engine';
import { prefs } from '@/services/storage/preferences';
import type { EntityType } from '@/types/schemas';
import { ENTITY_LABELS } from '@/utils/entities';
import { WebArticles } from './WebArticles';

const PAGE_SIZE = 20;
const CRUMBS = [{ label: 'Search' }];

/** Whether live web results are on. Default on; the choice is remembered in this browser. */
function useLiveWeb() {
  const [on, setOn] = useState(() => prefs.get('liveWeb', true));
  return [on, (v: boolean) => (prefs.set('liveWeb', v), setOn(v))] as const;
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-describedby={`${id}-hint`}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-ocean' : 'bg-muted/50')}
      >
        <span className={cn('absolute top-0.5 start-0.5 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5 rtl:-translate-x-5')} />
        <span className="sr-only">{label}</span>
      </button>
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-heading">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      </div>
    </div>
  );
}

function TopMatch({ result, query }: { result: SearchResult; query: string }) {
  const isCountry = result.type === 'country';
  return (
    <Link to={result.path} className="spot group relative block overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-7">
      <div aria-hidden="true" className="absolute -end-10 -top-16 size-48 rounded-full bg-aurora/15 blur-3xl" />
      <p className="text-xs font-semibold tracking-[0.14em] text-link uppercase">Top match · {ENTITY_LABELS[result.type].singular}</p>
      <div className="mt-3 flex items-start gap-4">
        {isCountry && result.country && <Flag code={result.country} className="mt-1.5 !h-6 !w-8" />}
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold text-heading group-hover:text-link">
            <Highlight text={result.title} query={query} terms={result.terms} />
          </h2>
          <p className="mt-1 text-sm text-muted">{result.subtitle}</p>
          {!isCountry && result.keywords && <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-relaxed text-ink">{result.keywords.slice(0, 260)}</p>}
        </div>
      </div>
      <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-link">
        {isCountry ? 'Open country profile' : 'Open record'}
        <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
      </p>
    </Link>
  );
}

export default function SearchPage() {
  const meta = routeMeta('/search');
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const q = (params.get('q') ?? '').trim();
  const type = (params.get('type') ?? '') as EntityType | '';
  useSeo({ title: q ? `“${q}” — search` : meta.title, description: meta.description, path: '/search', noindex: true });

  const engine = useAsync('search-engine', loadSearchEngine);
  const [liveWeb, setLiveWeb] = useLiveWeb();
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => setVisible(PAGE_SIZE), [location.search]);

  const all = useMemo(() => (engine.data && q ? engine.data.search(q) : []), [engine.data, q]);
  const counts = useMemo(() => all.reduce((m, r) => m.set(r.type, (m.get(r.type) ?? 0) + 1), new Map<EntityType, number>()), [all]);
  const results = type ? all.filter((r) => r.type === type) : all;
  const top = all[0];

  function setType(next: EntityType | '') {
    const p = new URLSearchParams(params);
    if (next) p.set('type', next);
    else p.delete('type');
    setParams(p, { replace: true });
  }

  const chip = (active: boolean) =>
    cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors', active ? 'border-navy bg-navy text-white dark:border-sky dark:bg-sky dark:text-navy' : 'border-line bg-surface text-ink hover:border-link hover:text-link');

  return (
    <>
      <PageHeader crumbs={CRUMBS} title="Search eport" description="eport’s own records first — countries, authorities, organizations and live tools — with live web context alongside. Typos and partial words are tolerated." />
      <div className="container-page py-10">
        <div className="max-w-2xl rounded-lg border border-line">
          <SearchCombobox variant="hero" initialQuery={q} inputId="page-search" />
        </div>
        <div className="mt-6 max-w-2xl">
          <Switch
            checked={liveWeb}
            onChange={setLiveWeb}
            label="Include live web results"
            hint="Fetches encyclopedia articles (Wikipedia) and news headlines (GDELT) directly from your browser. Your search words are sent to those services. Results are unverified."
          />
        </div>

        <div className="mt-10">
          {engine.status === 'error' && <ErrorState error={engine.error} onRetry={engine.reload} title="Search could not be loaded" />}
          {engine.status === 'loading' && q && <LoadingBlock lines={6} label="Searching" className="max-w-2xl" />}

          {engine.status !== 'error' && !q && (
            <EmptyState
              icon={Search}
              title="Type a name, code or topic"
              description={
                <>
                  Try a country (<Link className="link" to="/search?q=India">India</Link>), an ISO code (<Link className="link" to="/search?q=DEU">DEU</Link>), an abbreviation (
                  <Link className="link" to="/search?q=DGFT">DGFT</Link>) or a topic (<Link className="link" to="/search?q=phytosanitary">phytosanitary</Link>).
                  {engine.data && <> {engine.data.size} records are searchable today.</>}
                </>
              }
            />
          )}

          {engine.status === 'ready' && q && (
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
              <div className="min-w-0 space-y-8">
                {top && type === '' && <TopMatch result={top} query={q} />}

                <section aria-labelledby="onsite-heading">
                  <h2 id="onsite-heading" className="text-xl font-bold">
                    On eport
                  </h2>
                  <p role="status" className="tabular mt-1 text-sm text-muted">
                    {all.length === 0 ? `No eport records for “${q}”` : `${results.length} record${results.length === 1 ? '' : 's'} for “${q}”${type ? ` in ${ENTITY_LABELS[type].plural.toLowerCase()}` : ''}`}
                  </p>

                  {all.length > 0 && (
                    <div role="group" aria-label="Filter results by type" className="mt-4 flex flex-wrap gap-2">
                      <button type="button" aria-pressed={!type} onClick={() => setType('')} className={chip(!type)}>
                        All <span className="tabular opacity-70">{all.length}</span>
                      </button>
                      {[...counts].map(([t, n]) => (
                        <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={chip(type === t)}>
                          {ENTITY_LABELS[t].plural} <span className="tabular opacity-70">{n}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {all.length === 0 ? (
                    <EmptyState
                      className="mt-6"
                      title="Nothing on eport matched that search"
                      description={
                        liveWeb
                          ? 'eport searches only what it has published: countries, India’s national authorities, international organizations and live tools. See the live web results beside this for broader context.'
                          : 'eport searches only what it has published: countries, India’s national authorities, international organizations and live tools. Turn on live web results for broader context.'
                      }
                      action={
                        <Link to="/data-reliability" className="link text-sm">
                          See what is and is not covered
                        </Link>
                      }
                    />
                  ) : (
                    <ol className="mt-5 divide-y divide-line border-y border-line">
                      {results.slice(0, visible).map((r) => (
                        <li key={r.id}>
                          <Link to={r.path} className="group flex items-start justify-between gap-4 py-4">
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 font-display text-base font-bold text-heading group-hover:text-link">
                                {r.type === 'country' && r.country && <Flag code={r.country} />}
                                <Highlight text={r.title} query={q} terms={r.terms} />
                              </span>
                              <span className="mt-0.5 block text-sm text-muted">
                                <Highlight text={r.subtitle} query={q} terms={r.terms} />
                              </span>
                              {r.type !== 'country' && (
                                <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-ink">
                                  <Highlight text={r.keywords.slice(0, 220)} query={q} terms={r.terms} />
                                </span>
                              )}
                            </span>
                            <Badge tone="neutral" className="mt-0.5">
                              {ENTITY_LABELS[r.type].singular}
                            </Badge>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  )}
                  {results.length > visible && (
                    <div className="mt-5">
                      <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                        Show {Math.min(PAGE_SIZE, results.length - visible)} more
                      </Button>
                    </div>
                  )}
                </section>
              </div>

              <aside aria-label="Live web results" className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                {liveWeb ? (
                  <>
                    <section aria-labelledby="web-heading" className="rounded-2xl border border-line bg-surface p-5">
                      <h2 id="web-heading" className="mb-4 flex items-center gap-2 text-base font-bold">
                        <Globe2 aria-hidden="true" className="size-5 text-link" />
                        From the web — live
                      </h2>
                      <WebArticles query={q} />
                    </section>
                    <section aria-labelledby="headlines-heading" className="rounded-2xl border border-line bg-surface p-5">
                      <h2 id="headlines-heading" className="mb-4 flex items-center gap-2 text-base font-bold">
                        <Newspaper aria-hidden="true" className="size-5 text-link" />
                        Live news headlines
                      </h2>
                      <LiveHeadlines query={q} compact />
                    </section>
                  </>
                ) : (
                  <EmptyState icon={Globe2} title="Live web results are off" description="Turn them on above to see encyclopedia articles and news headlines for this search." />
                )}
              </aside>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
