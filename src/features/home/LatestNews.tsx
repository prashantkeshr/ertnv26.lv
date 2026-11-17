import { ArrowRight, Newspaper } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Reveal } from '@/components/common/motion';
import { ButtonLink, cn, Section, SectionHeading } from '@/components/common/primitives';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback/states';
import { NewsCard } from '@/features/news/NewsCard';
import { useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import type { NewsCategory } from '@/types/schemas';
import { formatDate } from '@/utils/format';
import { NEWS_CATEGORY_LABEL } from '@/utils/labels';

/** Newest items, taken round-robin across publishers so one feed cannot fill every slot. */
export function diversify<T extends { publisherName: string; publishedOn: string }>(items: T[], count: number): T[] {
  const queues = new Map<string, T[]>();
  for (const i of items) queues.set(i.publisherName, [...(queues.get(i.publisherName) ?? []), i]);
  const out: T[] = [];
  while (out.length < count && [...queues.values()].some((q) => q.length)) {
    const round = [...queues.values()].map((q) => q.shift()).filter((x): x is T => Boolean(x));
    round.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
    out.push(...round);
  }
  return out.slice(0, count);
}

export function LatestNews() {
  const { locale } = useI18n();
  const news = useDataset('news');
  const [category, setCategory] = useState<NewsCategory | ''>('');

  const categories = useMemo(() => {
    const counts = new Map<NewsCategory, number>();
    for (const i of news.data?.items ?? []) for (const c of i.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [news.data]);
  const shown = diversify((news.data?.items ?? []).filter((i) => !category || i.categories.includes(category)), 6);

  const chip = (active: boolean) => cn('min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors', active ? 'border-ocean bg-ocean text-white' : 'border-line bg-surface text-ink hover:border-link hover:text-link');

  return (
    <Section aria-labelledby="news-heading">
      <Reveal>
        <SectionHeading
          id="news-heading"
          kicker="Latest trade news"
          title="What the official sources are publishing"
          description={
            <>
              Headlines from the WTO, ITC, European Commission, ICC and UN News. Each links to the publisher’s original article.
              {news.data && <> Updated {formatDate(news.data.retrievedOn, locale)}.</>}
            </>
          }
          action={
            <ButtonLink to="/intelligence/news" variant="secondary">
              All trade news
              <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </ButtonLink>
          }
        />
      </Reveal>

      {news.status === 'error' && <ErrorState error={news.error} onRetry={news.reload} />}
      {news.status === 'loading' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      )}
      {news.status === 'ready' && (
        <>
          <div role="group" aria-label="Filter news by topic" className="mb-6 flex flex-wrap gap-2">
            <button type="button" aria-pressed={!category} onClick={() => setCategory('')} className={chip(!category)}>
              All topics
            </button>
            {categories.map(([c, n]) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>
                {NEWS_CATEGORY_LABEL[c]} <span className="tabular opacity-90">{n}</span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={Newspaper} title="No headlines for this topic right now" description="Try another topic, or see all news." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item, i) => (
                <li key={item.id}>
                  <Reveal delay={(i % 3) * 80} className="h-full">
                    <NewsCard item={item} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Topic tags are applied automatically by eport and can be imperfect. Headlines belong to their publishers and are not endorsed by eport.{' '}
            <Link to="/data-reliability" className="link">
              How this feed is built
            </Link>
            .
          </p>
        </>
      )}
    </Section>
  );
}
