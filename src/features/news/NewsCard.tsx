import { ArrowUpRight } from 'lucide-react';
import { hostOf } from '@/components/common/primitives';
import { Badge } from '@/components/common/StatusBadge';
import { spotlightHandlers } from '@/components/common/motion';
import { useI18n } from '@/i18n';
import type { NewsItem } from '@/types/schemas';
import { formatDate } from '@/utils/format';
import { NEWS_CATEGORY_LABEL } from '@/utils/labels';

/** One headline from an official publisher. The whole card is one link to the original article. */
export function NewsCard({ item }: { item: NewsItem }) {
  const { locale } = useI18n();
  return (
    <article {...spotlightHandlers()} className="spot group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
        <time dateTime={item.publishedOn} className="tabular">
          {formatDate(item.publishedOn, locale)}
        </time>
        <span aria-hidden="true">·</span>
        <span className="font-medium text-ink">{item.publisherName}</span>
      </p>
      <h3 className="mt-3 text-base leading-snug font-bold">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-heading transition-colors group-hover:text-link after:absolute after:inset-0 after:content-['']">
          {item.headline}
          <span className="sr-only"> (opens {hostOf(item.url)} in a new tab)</span>
        </a>
      </h3>
      {item.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{item.summary}</p>}
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {item.categories.map((c) => (
          <li key={c}>
            <Badge tone="neutral">{NEWS_CATEGORY_LABEL[c]}</Badge>
          </li>
        ))}
      </ul>
      <p className="mt-auto flex items-center justify-between pt-4 text-xs text-muted">
        <span>{hostOf(item.url)}</span>
        <ArrowUpRight aria-hidden="true" className="size-4 text-link transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </p>
    </article>
  );
}
