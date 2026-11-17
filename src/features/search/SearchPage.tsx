import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { routeMeta } from '@/app/route-meta';
import { PageHeader } from '@/components/common/PageHeader';
import { Button, cn } from '@/components/common/primitives';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { Highlight, SearchCombobox } from '@/components/search/SearchCombobox';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { loadSearchEngine } from '@/services/search/engine';
import type { EntityType } from '@/types/schemas';
import { ENTITY_LABELS } from '@/utils/entities';

const PAGE_SIZE = 20;
const CRUMBS = [{ label: 'Search' }];

export default function SearchPage() {
  const meta = routeMeta('/search');
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const q = (params.get('q') ?? '').trim();
  const type = (params.get('type') ?? '') as EntityType | '';
  useSeo({ title: q ? `“${q}” — search` : meta.title, description: meta.description, path: '/search', noindex: true });

  const engine = useAsync('search-engine', loadSearchEngine);
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => setVisible(PAGE_SIZE), [location.search]);

  const all = useMemo(() => (engine.data && q ? engine.data.search(q) : []), [engine.data, q]);
  const counts = useMemo(() => all.reduce((m, r) => m.set(r.type, (m.get(r.type) ?? 0) + 1), new Map<EntityType, number>()), [all]);
  const results = type ? all.filter((r) => r.type === type) : all;

  function setType(next: EntityType | '') {
    const p = new URLSearchParams(params);
    if (next) p.set('type', next);
    else p.delete('type');
    setParams(p, { replace: true });
  }

  const chip = (active: boolean) =>
    cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors', active ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink hover:border-ocean hover:text-ocean');

  return (
    <>
      <PageHeader crumbs={CRUMBS} title="Search eport" description="One search across countries, authorities, organizations and the tools that are live. Typos and partial words are tolerated." />
      <div className="container-page py-10">
        <div className="max-w-2xl rounded-lg border border-line">
          <SearchCombobox variant="hero" initialQuery={q} inputId="page-search" />
        </div>

        <div className="mt-8">
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
            <>
              <p role="status" className="tabular text-sm text-muted">
                {all.length === 0 ? `No results for “${q}”` : `${results.length} result${results.length === 1 ? '' : 's'} for “${q}”${type ? ` in ${ENTITY_LABELS[type].plural.toLowerCase()}` : ''}`}
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
                  title="Nothing matched that search"
                  description="eport searches only what it has published: countries, India's national authorities, international organizations and live tools. Documents, ports, HS codes and businesses are not yet available."
                  action={
                    <Link to="/data-reliability" className="link text-sm">
                      See what is and is not covered
                    </Link>
                  }
                />
              ) : (
                <ol className="mt-6 max-w-3xl divide-y divide-line border-y border-line">
                  {results.slice(0, visible).map((r) => (
                    <li key={r.id}>
                      <Link to={r.path} className="group flex items-start justify-between gap-4 py-4">
                        <span className="min-w-0">
                          <span className="block font-display text-base font-bold text-navy group-hover:text-ocean">
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
                        <span className="mt-0.5 shrink-0 rounded bg-soft px-2 py-0.5 text-xs text-muted ring-1 ring-line ring-inset">{ENTITY_LABELS[r.type].singular}</span>
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
