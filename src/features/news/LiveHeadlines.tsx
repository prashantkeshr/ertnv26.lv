/** Live news headlines from GDELT for a query. Unverified web content: labelled, attributed, and linked to each publisher. */
import { Newspaper, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/common/StatusBadge';
import { ErrorState, Skeleton } from '@/components/feedback/states';
import { Button } from '@/components/common/primitives';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { describeApiError } from '@/services/api/errors';
import { isSearchable, searchHeadlines } from '@/services/api/providers/gdelt';
import { formatDate } from '@/utils/format';

export function LiveHeadlines({ query, compact }: { query: string; compact?: boolean }) {
  const { locale } = useI18n();
  const q = query.trim();
  const state = useAsync(`gdelt:${q}`, () => searchHeadlines(q));

  if (!isSearchable(q)) {
    return <p className="text-sm text-muted">Live headlines need search words of three or more letters.</p>;
  }
  if (state.status === 'loading') {
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading live headlines</span>
        <div className="space-y-3">
          {Array.from({ length: compact ? 3 : 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Asking the news service — it allows one request every few seconds, so this can take a moment.</p>
      </div>
    );
  }
  if (state.status === 'error') {
    return <ErrorState title="Live headlines are unavailable" description={describeApiError(state.error)} onRetry={state.reload} />;
  }
  const { data, stale, fetchedAt } = state.data;
  if (data.length === 0) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted">
        <Newspaper aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        No recent English-language headlines matched “{q}”.
      </p>
    );
  }
  return (
    <div>
      <ul className="divide-y divide-line">
        {data.slice(0, compact ? 5 : 8).map((h) => (
          <li key={h.id} className="py-3 first:pt-0">
            <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-sm leading-snug font-semibold text-heading hover:text-link">
              {h.title}
              <span className="sr-only"> (opens {h.domain} in a new tab)</span>
            </a>
            <p className="mt-1 text-xs text-muted">
              {h.domain} · <time dateTime={h.publishedOn}>{formatDate(h.publishedOn, locale)}</time>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="warn">Unverified web content</Badge>
        <span>
          Headlines via the GDELT Project; each belongs to its publisher. Fetched {formatDate(fetchedAt, locale)}.
        </span>
        {stale && <Badge tone="warn">Cached — refresh failed</Badge>}
      </p>
      <Button variant="ghost" size="sm" className="mt-2 -ms-2" onClick={state.reload}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Refresh
      </Button>
    </div>
  );
}
