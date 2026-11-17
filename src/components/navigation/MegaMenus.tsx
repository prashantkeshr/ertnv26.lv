/**
 * Mega menus for the header.
 *
 *  - Countries: a region rail (hover, focus or click to switch), the region's largest economies
 *    with flags (ranked from World Bank data at build time), and a "Helpful resources" panel.
 *  - Resources: Latest news, official videos, and process guides.
 *
 * Content is loaded the first time a menu opens, never on page load.
 */
import { ArrowRight, ArrowUpRight, Globe2, Newspaper, PlayCircle, Route } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Flag, Monogram } from '@/components/common/Flag';
import { buttonClass, cn } from '@/components/common/primitives';
import { Skeleton } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { formatDate, formatUsdCompact } from '@/utils/format';

const REGION_ORDER = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

function RailButton({ active, onActivate, children, icon: Icon }: { active: boolean; onActivate: () => void; children: React.ReactNode; icon: typeof Globe2 }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onActivate()}
      onFocus={onActivate}
      onClick={onActivate}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-start text-sm font-semibold transition-all duration-200',
        active ? 'bg-navy text-white shadow-[0_10px_24px_-14px_rgb(11_31_51/0.9)] dark:bg-ocean' : 'bg-surface text-heading hover:bg-soft',
      )}
    >
      <Icon aria-hidden="true" className={cn('size-5 shrink-0', active ? 'text-sky' : 'text-muted')} strokeWidth={1.7} />
      {children}
      <span aria-hidden="true" className={cn('absolute inset-y-0 -end-1.5 my-auto h-3 w-3 rotate-45 rounded-[2px] bg-navy transition-opacity dark:bg-ocean', active ? 'opacity-100' : 'opacity-0')} />
    </button>
  );
}

export function CountriesPanel({ onNavigate }: { onNavigate: () => void }) {
  const { locale } = useI18n();
  const featured = useDataset('featured');
  const countries = useDataset('countries');
  const [region, setRegion] = useState('Asia');

  const regions = useMemo(() => {
    const keys = Object.keys(featured.data?.regions ?? {});
    return [...REGION_ORDER.filter((r) => keys.includes(r)), ...keys.filter((r) => !REGION_ORDER.includes(r))];
  }, [featured.data]);
  const list = featured.data?.regions[region] ?? [];
  const totalInRegion = countries.data?.filter((c) => c.region === region).length;

  return (
    <div className="menu-in container-page grid gap-6 py-8 lg:grid-cols-[15rem_1fr_17rem]">
      <div>
        <p className="mb-3 text-sm font-semibold tracking-wide text-muted">Regions</p>
        <div className="space-y-2">
          {featured.status !== 'ready'
            ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
            : regions.map((r) => (
                <RailButton key={r} active={region === r} onActivate={() => setRegion(r)} icon={Globe2}>
                  {r}
                  <span className="tabular ms-auto text-xs font-normal opacity-90">{countries.data?.filter((c) => c.region === r).length ?? ''}</span>
                </RailButton>
              ))}
        </div>
        <Link to="/countries" onClick={onNavigate} className={cn(buttonClass('primary', 'md'), 'mt-4 w-full justify-start')}>
          All countries and territories
          <ArrowRight aria-hidden="true" className="ms-auto size-4 rtl:rotate-180" />
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="text-sm font-semibold tracking-wide text-muted">{region}</p>
        {featured.status === 'ready' ? (
          <>
            <ul key={region} className="menu-in mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {list.map((c) => (
                <li key={c.code}>
                  <Link to={`/countries/${c.code}`} onClick={onNavigate} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-soft">
                    <Flag code={c.code} className="!h-5 !w-7 !rounded" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading group-hover:text-link">{c.name}</span>
                      <span className="tabular block text-xs text-muted">
                        Exports {formatUsdCompact(c.value, locale).replace(/ (?=[a-z])/i, ' ')} · {c.year}
                      </span>
                    </span>
                    <ArrowUpRight aria-hidden="true" className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to={`/regions/${region.toLowerCase()}`} onClick={onNavigate} className={buttonClass('primary', 'md')}>
                {region} trade overview
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
              <Link to={`/countries?region=${encodeURIComponent(region)}`} onClick={onNavigate} className={buttonClass('secondary', 'md')}>
                View all {totalInRegion ?? ''} in {region}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">The largest economies in each region by exports of goods and services, from World Bank data. Every country has a profile.</p>
          </>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        )}
      </div>

      <HelpfulResources onNavigate={onNavigate} />
    </div>
  );
}

function HelpfulResources({ onNavigate }: { onNavigate: () => void }) {
  const links = [
    { to: '/countries/IN#guide', label: 'India: export and import process guide' },
    { to: '/directory/authorities', label: 'Official trade authorities' },
    { to: '/directory/organizations', label: 'International organizations' },
    { to: '/academy/videos', label: 'Official explainer videos' },
    { to: '/methodology', label: 'How eport labels sources and verification' },
    { to: '/data-reliability', label: 'Data Reliability Centre' },
  ];
  return (
    <aside aria-label="Helpful resources" className="rounded-2xl bg-info-soft p-6">
      <p className="font-display text-base font-bold text-heading">Helpful resources</p>
      <ul className="mt-3 space-y-3">
        {links.map((l) => (
          <li key={l.to} className="flex gap-2.5 text-sm leading-snug">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-link" />
            <Link to={l.to} onClick={onNavigate} className="font-medium text-ink hover:text-link hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/contact" onClick={onNavigate} className={cn(buttonClass('secondary', 'md'), 'mt-6')}>
        Contact us
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    </aside>
  );
}

type Category = 'news' | 'videos' | 'guides';

export function ResourcesPanel({ onNavigate }: { onNavigate: () => void }) {
  const { locale } = useI18n();
  const [category, setCategory] = useState<Category>('news');
  const news = useDataset('news');
  const videos = useDataset('videos');
  const guides = useDataset('guides');
  const countries = useDataset('countries');

  const latestNews = (() => {
    const seen = new Set<string>();
    return (news.data?.items ?? []).filter((i) => (seen.has(i.publisherName) ? false : (seen.add(i.publisherName), true))).slice(0, 4);
  })();

  return (
    <div className="menu-in container-page grid gap-6 py-8 lg:grid-cols-[15rem_1fr]">
      <div>
        <p className="mb-3 text-sm font-semibold tracking-wide text-muted">Categories</p>
        <div className="space-y-2">
          <RailButton active={category === 'news'} onActivate={() => setCategory('news')} icon={Newspaper}>
            Latest news
          </RailButton>
          <RailButton active={category === 'videos'} onActivate={() => setCategory('videos')} icon={PlayCircle}>
            Videos
          </RailButton>
          <RailButton active={category === 'guides'} onActivate={() => setCategory('guides')} icon={Route}>
            Guides
          </RailButton>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        {category === 'news' && (
          <div key="news" className="menu-in">
            <p className="text-sm font-semibold tracking-wide text-muted">Latest news | Official publishers</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {news.status !== 'ready'
                ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                : latestNews.map((n) => (
                    <li key={n.id}>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className="group flex h-full gap-3 rounded-xl border border-line p-3 transition-colors hover:border-link">
                        <Monogram text={n.publisherName.split(' ').map((w) => w[0]).join('')} className="size-12 rounded-xl" />
                        <span className="min-w-0">
                          <span className="line-clamp-2 block text-sm leading-snug font-semibold text-heading group-hover:text-link">
                            {n.headline}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </span>
                          <span className="tabular mt-1 block text-xs text-muted">
                            {n.publisherName} · {formatDate(n.publishedOn, locale)}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
            </ul>
            <Link to="/intelligence/news" onClick={onNavigate} className={cn(buttonClass('secondary', 'md'), 'mt-5')}>
              All trade news
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        )}

        {category === 'videos' && (
          <div key="videos" className="menu-in">
            <p className="text-sm font-semibold tracking-wide text-muted">Videos | From official channels</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {videos.status !== 'ready'
                ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                : videos.data.videos
                    .filter((v, i, all) => all.findIndex((x) => x.sourceId === v.sourceId) === i)
                    .slice(0, 4)
                    .map((v) => (
                      <li key={v.id}>
                        <Link to="/academy/videos" onClick={onNavigate} className="group flex h-full items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-link">
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy text-white">
                            <PlayCircle aria-hidden="true" className="size-6" />
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 block text-sm leading-snug font-semibold text-heading group-hover:text-link">{v.title}</span>
                            <span className="mt-0.5 block text-xs text-muted">{v.channel}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
            </ul>
            <Link to="/academy/videos" onClick={onNavigate} className={cn(buttonClass('secondary', 'md'), 'mt-5')}>
              All videos
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        )}

        {category === 'guides' && (
          <div key="guides" className="menu-in">
            <p className="text-sm font-semibold tracking-wide text-muted">Guides | Process overviews and method</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {(guides.data ?? []).map((g) => {
                const name = countries.data?.find((c) => c.cca2 === g.countryCode)?.name ?? g.countryCode;
                return (
                  <li key={g.countryCode}>
                    <Link to={`/countries/${g.countryCode}#guide`} onClick={onNavigate} className="group flex h-full items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-link">
                      <Flag code={g.countryCode} className="!h-6 !w-8" />
                      <span>
                        <span className="block text-sm font-semibold text-heading group-hover:text-link">{name}: export and import process</span>
                        <span className="block text-xs text-muted">eport overview · needs review</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {[
                { to: '/methodology', title: 'Sources and methodology', sub: 'How records are sourced and labelled' },
                { to: '/data-reliability', title: 'Data Reliability Centre', sub: 'What is verified, partial or missing' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} onClick={onNavigate} className="group flex h-full items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-link">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-soft text-link">
                      <Route aria-hidden="true" className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-heading group-hover:text-link">{l.title}</span>
                      <span className="block text-xs text-muted">{l.sub}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted">Country process guides are published one market at a time, starting with India.</p>
          </div>
        )}
      </div>
    </div>
  );
}
