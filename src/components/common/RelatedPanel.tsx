/**
 * "Connected records" — the Global Trade Knowledge Graph as the reader sees it.
 * Lists everything linked to the current record in either direction, so related
 * authorities, organizations and countries are one click away without another search.
 */
import { Waypoints } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { relatedTo } from '@/services/graph/graph';
import { ENTITY_LABELS } from '@/utils/entities';

export function RelatedPanel({ entityRef, emptyHint }: { entityRef: string; emptyHint?: string }) {
  const graph = useDataset('graph');
  const groups = graph.data ? relatedTo(graph.data, entityRef) : [];

  return (
    <section aria-labelledby="related-heading">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-link uppercase">
        <Waypoints aria-hidden="true" className="size-4" />
        Trade Knowledge Graph
      </p>
      <h2 id="related-heading" className="text-xl font-bold">
        Connected records
      </h2>

      <div className="mt-5">
        {graph.status === 'loading' && <LoadingBlock lines={3} />}
        {graph.status === 'error' && <ErrorState error={graph.error} onRetry={graph.reload} />}
        {graph.status === 'ready' && groups.length === 0 && (
          <EmptyState
            icon={Waypoints}
            title="No connected records published yet"
            description={emptyHint ?? 'Links appear here as related authorities, documents, ports and agreements are published.'}
          />
        )}
        {groups.map((group) => (
          <div key={group.key} className="mb-6 last:mb-0">
            <h3 className="mb-2 text-sm font-semibold text-muted">
              {group.label} <span className="tabular font-normal">({group.items.length})</span>
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.items.map((item) => (
                <li key={item.ref}>
                  <Link to={item.node.path} className="group block h-full rounded-md border border-line bg-surface px-4 py-3 transition-colors hover:border-ocean">
                    <span className="block text-sm font-semibold text-heading group-hover:text-link">{item.node.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {ENTITY_LABELS[item.node.type].singular}
                      {item.node.meta && <> · {item.node.meta}</>}
                    </span>
                    {item.note && <span className="mt-1.5 block text-xs leading-relaxed text-muted">{item.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
