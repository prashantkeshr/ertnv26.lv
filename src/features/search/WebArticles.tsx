/** Live Wikipedia results for a query. Context only: unverified, attributed (CC BY-SA 4.0), linked to each article. */
import { BookOpen } from 'lucide-react';
import { Highlight } from '@/components/search/SearchCombobox';
import { Badge } from '@/components/common/StatusBadge';
import { ErrorState, Skeleton } from '@/components/feedback/states';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { describeApiError } from '@/services/api/errors';
import { searchWikipedia } from '@/services/api/providers/wikipedia';
import { formatDate } from '@/utils/format';

export function WebArticles({ query }: { query: string }) {
  const { locale } = useI18n();
  const q = query.trim();
  const state = useAsync(`wikipedia:${q}`, () => searchWikipedia(q));

  if (state.status === 'loading') {
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading web results</span>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (state.status === 'error') return <ErrorState title="Web results are unavailable" description={describeApiError(state.error)} onRetry={state.reload} />;

  const { data, stale, fetchedAt } = state.data;
  if (data.length === 0) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted">
        <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        No encyclopedia articles matched “{q}”.
      </p>
    );
  }
  return (
    <div>
      <ol className="space-y-5">
        {data.map((a) => (
          <li key={a.id}>
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-link hover:text-link-hover hover:underline">
              <Highlight text={a.title} query={q} />
              <span className="sr-only"> (Wikipedia, opens in a new tab)</span>
            </a>
            <p className="mt-0.5 text-xs text-muted">en.wikipedia.org</p>
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink">
              <Highlight text={a.extract} query={q} />
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="warn">Unverified web content</Badge>
        <span>Text from Wikipedia contributors, CC BY-SA 4.0. Fetched {formatDate(fetchedAt, locale)}.</span>
        {stale && <Badge tone="warn">Cached — refresh failed</Badge>}
      </p>
    </div>
  );
}
