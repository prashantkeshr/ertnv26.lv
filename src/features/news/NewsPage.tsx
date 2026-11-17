import { Newspaper, Radio, Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { routeMeta } from '@/app/route-meta';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { Badge } from '@/components/common/StatusBadge';
import { Button, cn, inputClass } from '@/components/common/primitives';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { prefs } from '@/services/storage/preferences';
import type { NewsCategory } from '@/types/schemas';
import { formatDate } from '@/utils/format';
import { NEWS_CATEGORY_LABEL } from '@/utils/labels';
import { LiveHeadlines } from './LiveHeadlines';
import { NewsCard } from './NewsCard';

const PAGE = 12;
const CRUMBS = [{ label: 'Intelligence', path: '/intelligence' }, { label: 'Trade news' }];
const TOPICS = ['container shipping', 'port congestion', 'tariffs', 'supply chain disruption', 'customs clearance', 'freight rates'];

export default function NewsPage() {
  const meta = routeMeta('/intelligence/news');
  useSeo({ title: meta.title, description: meta.description, path: '/intelligence/news', breadcrumbs: seoCrumbs(CRUMBS, '/intelligence/news') });
  const { locale } = useI18n();
  const news = useDataset('news');
  const [category, setCategory] = useState<NewsCategory | ''>('');
  const [publisher, setPublisher] = useState('');
  const [visible, setVisible] = useState(PAGE);
  const [liveOn] = useState(() => prefs.get('liveWeb', true));
  const [topic, setTopic] = useState('maritime shipping');
  const [draft, setDraft] = useState('');

  const items = news.data?.items ?? [];
  const categories = useMemo(() => [...items.reduce((m, i) => i.categories.reduce((mm, c) => mm.set(c, (mm.get(c) ?? 0) + 1), m), new Map<NewsCategory, number>())].sort((a, b) => b[1] - a[1]), [items]);
  const publishers = useMemo(() => [...new Set(items.map((i) => i.publisherName))].sort(), [items]);
  const filtered = items.filter((i) => (!category || i.categories.includes(category)) && (!publisher || i.publisherName === publisher));

  const chip = (active: boolean) => cn('min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors', active ? 'border-ocean bg-ocean text-white' : 'border-line bg-surface text-ink hover:border-link hover:text-link');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.trim()) setTopic(draft.trim());
  }

  return (
    <>
      <PageHeader
        crumbs={CRUMBS}
        kicker="eport Intelligence"
        title="Trade and maritime news"
        description="Headlines from official publishers, refreshed daily, plus a live headline search. Every item links to the original article — eport shows the headline, not the story."
      >
        {news.data && <Badge tone="neutral">Official feeds updated {formatDate(news.data.retrievedOn, locale)}</Badge>}
      </PageHeader>

      <div className="container-page py-12">
        <section aria-labelledby="official-heading">
          <h2 id="official-heading" className="text-2xl font-bold">
            From official publishers
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            WTO, International Trade Centre, European Commission, International Chamber of Commerce and UN News. Topic tags are applied automatically by eport and can be imperfect.
          </p>

          {news.status === 'error' && <ErrorState className="mt-6" error={news.error} onRetry={news.reload} />}
          {news.status === 'loading' && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          )}
          {news.status === 'ready' && (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_16rem]">
                <div role="group" aria-label="Filter by topic" className="flex flex-wrap gap-2">
                  <button type="button" aria-pressed={!category} onClick={() => (setCategory(''), setVisible(PAGE))} className={chip(!category)}>
                    All topics
                  </button>
                  {categories.map(([c, n]) => (
                    <button key={c} type="button" aria-pressed={category === c} onClick={() => (setCategory(c), setVisible(PAGE))} className={chip(category === c)}>
                      {NEWS_CATEGORY_LABEL[c]} <span className="tabular opacity-70">{n}</span>
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-heading">
                  Publisher
                  <select value={publisher} onChange={(e) => (setPublisher(e.target.value), setVisible(PAGE))} className={`${inputClass} mt-1.5`}>
                    <option value="">All publishers</option>
                    {publishers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p role="status" className="tabular mt-5 text-sm text-muted">
                {filtered.length} of {items.length} headlines
              </p>
              {filtered.length === 0 ? (
                <EmptyState className="mt-4" icon={Newspaper} title="No headlines match these filters" description="Clear a filter to see more." />
              ) : (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.slice(0, visible).map((item) => (
                    <li key={item.id}>
                      <NewsCard item={item} />
                    </li>
                  ))}
                </ul>
              )}
              {filtered.length > visible && (
                <div className="mt-6 text-center">
                  <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>
                    Show {Math.min(PAGE, filtered.length - visible)} more
                  </Button>
                </div>
              )}

              <details className="mt-8 rounded-lg border border-line bg-soft p-4 text-sm">
                <summary className="cursor-pointer font-semibold text-heading">Feed status</summary>
                <ul className="mt-3 space-y-1.5">
                  {news.data.feeds.map((f) => (
                    <li key={f.sourceId} className="flex flex-wrap items-center gap-2">
                      <Badge tone={f.ok ? 'ok' : 'warn'}>{f.ok ? 'Updated' : 'Using previous items'}</Badge>
                      <span className="text-ink">{f.publisherName}</span>
                      <span className="tabular text-muted">{f.items} items</span>
                      {f.note && <span className="text-xs text-muted">{f.note}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </section>

        <section aria-labelledby="live-heading" className="mt-16 border-t border-line pt-12">
          <h2 id="live-heading" className="flex items-center gap-2 text-2xl font-bold">
            <Radio aria-hidden="true" className="size-6 text-link" />
            Live web headlines
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Search recent news from across the web, live. Headlines come from the GDELT Project, are not vetted by eport, and each links to its publisher. Your search words are sent to GDELT.
          </p>
          {liveOn ? (
            <>
              <form onSubmit={submit} role="search" aria-label="Search live headlines" className="mt-5 flex max-w-xl gap-2">
                <label className="sr-only" htmlFor="live-topic">
                  Topic
                </label>
                <input id="live-topic" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Red Sea shipping, EU tariffs, port strike" className={inputClass} />
                <Button type="submit">
                  <Search aria-hidden="true" className="size-4" />
                  Search
                </Button>
              </form>
              <div role="group" aria-label="Suggested topics" className="mt-3 flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button key={t} type="button" aria-pressed={topic === t} onClick={() => (setTopic(t), setDraft(''))} className={chip(topic === t)}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-6 max-w-3xl rounded-2xl border border-line bg-surface p-5">
                <h3 className="mb-4 text-base font-bold">Latest headlines: {topic}</h3>
                <LiveHeadlines query={topic} />
              </div>
            </>
          ) : (
            <EmptyState className="mt-6" icon={Radio} title="Live web results are turned off" description="You turned them off on the search page. Turn them on there to search live headlines here." />
          )}
        </section>
      </div>
    </>
  );
}
