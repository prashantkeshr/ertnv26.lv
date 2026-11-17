import { ArrowRight, BookOpen, CircleCheck, CircleDashed, FileText, Lock, Route, Scale, ShieldCheck, Ship, Waypoints, type LucideIcon } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { DIVISIONS, STATUS_LABEL, type ModuleStatus } from '@/app/modules';
import { routeMeta, SITE } from '@/app/route-meta';
import { IndicatorPanel } from '@/components/charts/IndicatorPanel';
import { CountUp, Reveal, spotlightHandlers } from '@/components/common/motion';
import { ButtonLink, cn, Section, SectionHeading } from '@/components/common/primitives';
import { CountryLevelBadge, ModuleStatusBadge } from '@/components/common/StatusBadge';
import { ErrorState, Skeleton } from '@/components/feedback/states';
import { DIVISION_ICON } from '@/components/navigation/Header';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { ContactSection } from '@/features/contact/ContactSection';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { formatDate, formatNumber } from '@/utils/format';
import { HeroCards } from './HeroCards';
import { LatestNews } from './LatestNews';
import { Faq, HowItWorks } from './ProcessAndFaq';
import { QuickFinder } from './QuickFinder';
import { ReferenceMarquee } from './ReferenceMarquee';
import { Solutions } from './Solutions';

const WorldMap = lazy(() => import('@/components/maps/WorldMap'));
const HeroGlobe = lazy(() => import('./HeroGlobe'));

const stagger = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

const QUICK_LINKS = [
  { to: '/countries', label: 'Explore countries' },
  { to: '/countries/IN', label: 'India trade profile' },
  { to: '/directory/authorities', label: 'Official authorities' },
  { to: '/directory/organizations', label: 'International organizations' },
];

const ASSURANCES: Array<{ icon: LucideIcon; text: string; to?: string }> = [
  { icon: ShieldCheck, text: 'Every figure linked to its source', to: '/data-reliability' },
  { icon: Lock, text: 'No accounts. Nothing uploaded.' },
  { icon: Scale, text: 'Independent of any government' },
];

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <section className="hero-bg relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="container-page grid items-center gap-6 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 lg:py-20">
        <div>
          <p className="rise inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-[0.12em] text-sky uppercase" style={stagger(0)}>
            <span className="relative flex size-2">
              <span className="ping absolute inline-flex size-full rounded-full bg-aurora opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-aurora" />
            </span>
            {SITE.positioning}
          </p>
          <h1 className="rise mt-6 text-[2.5rem] leading-[1.05] font-extrabold text-white sm:text-5xl lg:text-[3.6rem]" style={stagger(100)}>
            Connecting Global Trade. <span className="text-shine">Simplifying International Commerce.</span>
          </h1>
          <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-white/80" style={stagger(220)}>
            Discover markets. Understand regulations. Prepare documentation. Explore maritime intelligence. Connect with global trade opportunities.
          </p>

          {/* z-20: the suggestion dropdown must paint above the rows that follow it. */}
          <div className="rise relative z-20 mt-8 max-w-xl" style={stagger(340)}>
            <SearchCombobox variant="hero" inputId="hero-search" />
          </div>

          <div className="rise mt-6 flex flex-wrap gap-3" style={stagger(440)}>
            <ButtonLink to="/countries" variant="light" size="lg">
              Explore countries
              <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </ButtonLink>
            <ButtonLink to="/contact" variant="inverse" size="lg">
              Get in touch
            </ButtonLink>
          </div>

          <ul className="rise mt-8 flex flex-wrap gap-x-6 gap-y-2.5" style={stagger(540)}>
            {ASSURANCES.map((a) => (
              <li key={a.text} className="flex items-center gap-2 text-sm text-white/80">
                <a.icon aria-hidden="true" className="size-4 shrink-0 text-sky" />
                {a.to ? (
                  <Link to={a.to} className="underline decoration-white/30 underline-offset-4 hover:decoration-white">
                    {a.text}
                  </Link>
                ) : (
                  a.text
                )}
              </li>
            ))}
          </ul>
          <ul className="rise mt-5 flex flex-wrap gap-2" style={stagger(620)}>
            {QUICK_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="inline-flex min-h-9 items-center rounded-full border border-white/20 px-3.5 text-sm text-white/85 transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem] lg:max-w-none">
          <Suspense fallback={<div className="aspect-square w-full" />}>
            <HeroGlobe className="rise block aspect-square w-full" />
          </Suspense>
          <HeroCards />
          <p className="mt-1 text-center text-xs text-white/70">Illustrative global network — not live vessel or traffic data.</p>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- stats */

/** Coverage figures are counted from the published dataset manifest — they are not marketing numbers. */
function CoverageStrip() {
  const { locale } = useI18n();
  const manifest = useDataset('manifest');
  const records = (id: string) => manifest.data?.datasets.find((d) => d.id === id)?.records ?? null;
  const items = [
    { label: 'Countries and territories indexed', id: 'countries' },
    { label: 'Economies with trade indicators', id: 'trade-indicators' },
    { label: 'Official authorities listed', id: 'authorities-in' },
    { label: 'International organizations', id: 'organizations' },
  ];
  return (
    <section aria-label="Published coverage" className="bg-surface">
      <div className="container-page py-12 sm:py-14">
        {manifest.status === 'error' ? (
          <ErrorState error={manifest.error} onRetry={manifest.reload} />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {items.map((item, i) => (
                <Reveal key={item.id} delay={i * 90} className="border-s-2 border-accent ps-5">
                  <dd className="tabular font-display text-4xl font-extrabold text-heading sm:text-5xl">
                    {manifest.status === 'loading' || records(item.id) === null ? <Skeleton className="h-10 w-20" /> : <CountUp value={records(item.id)!} format={(n) => formatNumber(n, locale)} />}
                  </dd>
                  <dt className="mt-2 text-sm text-muted">{item.label}</dt>
                </Reveal>
              ))}
            </dl>
            <p className="mt-8 text-xs text-muted">
              Counted from eport's published datasets{manifest.data && <> on {formatDate(manifest.data.generatedAt, locale)}</>}. See what is verified, partial or not yet available in the{' '}
              <Link to="/data-reliability" className="link">
                Data Reliability Centre
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- divisions */

const SPANS = ['lg:col-span-4', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-4', 'lg:col-span-3', 'lg:col-span-3'];

function Divisions() {
  return (
    <Section tone="soft" aria-labelledby="divisions-heading">
      <Reveal>
        <SectionHeading
          id="divisions-heading"
          kicker="The platform"
          title="Six connected divisions"
          description="eport is being built in tested stages. Each division shows exactly which of its modules work today and which are still in development."
        />
      </Reveal>
      <div className="grid gap-4 lg:grid-cols-6">
        {DIVISIONS.map((d, i) => {
          const Icon = DIVISION_ICON[d.icon];
          const available = d.modules.filter((m) => m.status === 'live' || m.status === 'foundation').length;
          const wide = SPANS[i]!.endsWith('4') || SPANS[i]!.endsWith('3');
          return (
            <Reveal key={d.id} delay={(i % 3) * 90} className={cn('sm:col-span-1', SPANS[i])}>
              <Link to={d.path} {...spotlightHandlers()} className="spot group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 sm:p-7">
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-xl bg-info-soft text-link transition-colors duration-300 group-hover:bg-ocean group-hover:text-white">
                    <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  </span>
                  <span aria-hidden="true" className="tabular font-display text-sm font-bold text-muted">
                    0{i + 1}
                  </span>
                </div>
                <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{d.kicker}</p>
                <h3 className="mt-1 text-xl font-bold transition-colors group-hover:text-link">{d.purpose}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d.description}</p>

                {wide && (
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {d.modules.slice(0, 5).map((m) => {
                      const ready = m.status === 'live' || m.status === 'foundation';
                      return (
                        <li key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-soft px-2.5 py-1 text-xs text-ink">
                          {ready ? <CircleCheck aria-hidden="true" className="size-3.5 text-ok" /> : <CircleDashed aria-hidden="true" className="size-3.5 text-muted" />}
                          {m.title}
                          <span className="sr-only">({STATUS_LABEL[m.status as ModuleStatus]})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-auto pt-6">
                  <div aria-hidden="true" className="flex gap-1">
                    {d.modules.map((m) => (
                      <span key={m.id} className={cn('h-1 flex-1 rounded-full', m.status === 'live' || m.status === 'foundation' ? 'bg-ocean' : 'bg-line')} />
                    ))}
                  </div>
                  <p className="mt-3 flex items-center justify-between text-sm">
                    <span className="tabular text-muted">
                      {available} of {d.modules.length} modules available
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 text-link transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
                  </p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- country */

function CountryExploration() {
  const countries = useDataset('countries');
  const coverage = useDataset('coverage');
  const error = countries.error ?? coverage.error;
  const regions = countries.data
    ? [...countries.data.reduce((m, c) => m.set(c.region, (m.get(c.region) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])
    : [];

  return (
    <Section aria-labelledby="map-heading">
      <Reveal>
        <SectionHeading
          id="map-heading"
          kicker="Country exploration"
          title="Explore trade by country"
          description="Open any country for its identifiers, sourced trade indicators, reference exchange rate and linked authorities."
          action={
            <ButtonLink to="/countries" variant="secondary">
              Browse all countries
              <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </ButtonLink>
          }
        />
      </Reveal>
      {error ? (
        <ErrorState error={error} onRetry={() => (countries.reload(), coverage.reload())} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
          <Reveal from="scale">
            {countries.data && coverage.data ? (
              <Suspense fallback={<Skeleton className="aspect-[96/50] w-full rounded-lg" />}>
                <WorldMap countries={countries.data} coverage={coverage.data} />
              </Suspense>
            ) : (
              <Skeleton className="aspect-[96/50] w-full rounded-lg" />
            )}
          </Reveal>
          <Reveal delay={120}>
            <h3 className="text-sm font-bold">By region</h3>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {regions.map(([region, count]) => (
                <li key={region}>
                  <Link to={`/countries?region=${encodeURIComponent(region)}`} className="group flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium text-heading transition-colors group-hover:text-link">{region}</span>
                    <span className="tabular text-muted">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="spot mt-6 rounded-xl border border-line bg-surface p-4" {...spotlightHandlers()}>
              <p className="text-xs font-semibold tracking-[0.14em] text-link uppercase">Reference market</p>
              <p className="mt-1 font-display font-bold text-heading">India</p>
              <div className="mt-2">
                <CountryLevelBadge level="operational-seed" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">The first market being documented in operational depth, starting with its national trade authorities.</p>
              <Link to="/countries/IN" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:text-link-hover">
                Open India profile <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </Link>
            </div>
          </Reveal>
        </div>
      )}
    </Section>
  );
}

/* --------------------------------------------------------------- roadmap */

const TASKS: Array<{ icon: LucideIcon; title: string; text: string; to: string; cta: string; status: ModuleStatus }> = [
  { icon: BookOpen, title: 'Learn to export or import', text: 'Step-by-step Export and Import Academy pathways, from choosing a product to reconciling payment.', to: '/academy', cta: 'eport Academy', status: 'planned' },
  { icon: FileText, title: 'Understand trade documents', text: 'What each document is, who prepares and issues it, what it depends on, and when it actually applies.', to: '/academy', cta: 'Documentation Centre', status: 'planned' },
  { icon: Route, title: 'Plan a shipment', text: 'The Smart Trade Navigator will turn a shipment description into a preliminary, source-linked action plan.', to: '/trade-desk', cta: 'eport Trade Desk', status: 'planned' },
  { icon: Ship, title: 'Track cargo and vessels', text: 'Routing to official carrier tracking pages, and vessel information where a data provider permits it.', to: '/intelligence', cta: 'eport Intelligence', status: 'planned' },
];

function Roadmap() {
  return (
    <Section tone="soft" aria-labelledby="tasks-heading">
      <Reveal>
        <SectionHeading
          id="tasks-heading"
          kicker="Where this is going"
          title="Tools being built next"
          description="These modules are in development. They are listed so you can see the plan — nothing here pretends to work before it does."
        />
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TASKS.map((task, i) => (
          <Reveal key={task.title} delay={i * 90}>
            <div {...spotlightHandlers()} className="spot flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
              <task.icon aria-hidden="true" className="size-6 text-link" strokeWidth={1.75} />
              <h3 className="mt-4 text-base font-bold">{task.title}</h3>
              <div className="mt-2">
                <ModuleStatusBadge status={task.status} />
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{task.text}</p>
              <Link to={task.to} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:text-link-hover">
                {task.cta} <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- trust */

const PRINCIPLES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Scale, title: 'Official sources first', text: 'Government authorities, then international organizations, then official operators. Secondary publications are used for context only.' },
  { icon: ShieldCheck, title: 'Every status is labelled', text: 'Records say whether they are reviewed, source-referenced, in need of review or outdated. Requirements are mandatory, conditional, optional or unknown — and unknown never means “not required”.' },
  { icon: Waypoints, title: 'Limits are shown, not hidden', text: 'If data is missing, partial or needs a secure service that a static site cannot provide, eport says so and links to the official source.' },
];

function Trust() {
  return (
    <Section tone="navy" className="hero-bg relative isolate overflow-hidden" aria-labelledby="trust-heading">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <Reveal>
        <SectionHeading
          id="trust-heading"
          inverse
          kicker="Trust and methodology"
          title="Accuracy before completeness"
          description="eport is an independent platform. It is not a government, customs, port or regulatory service, and its guidance is preliminary — never a legal determination."
        />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-3">
        {PRINCIPLES.map((p, i) => (
          <Reveal key={p.title} delay={i * 100}>
            <div className="glass h-full rounded-2xl p-6">
              <p.icon aria-hidden="true" className="size-6 text-sky" strokeWidth={1.75} />
              <h3 className="mt-4 text-lg font-bold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{p.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/methodology" variant="light">
          Sources and methodology
        </ButtonLink>
        <ButtonLink to="/data-reliability" variant="inverse">
          Data Reliability Centre
        </ButtonLink>
      </Reveal>
    </Section>
  );
}

/* ------------------------------------------------------------------ page */

export default function HomePage() {
  const meta = routeMeta('/');
  useSeo({ title: meta.title, description: meta.description, path: '/' });

  return (
    <>
      <Hero />
      <ReferenceMarquee />
      <CoverageStrip />
      <Solutions />
      <QuickFinder />
      <Divisions />
      <CountryExploration />
      <Section tone="soft" aria-labelledby="stats-heading">
        <Reveal>
          <SectionHeading
            id="stats-heading"
            kicker="Trade statistics"
            title="World trade at a glance"
            description="World totals for trade in goods and services. Historical annual statistics — not live data or forecasts."
            action={
              <ButtonLink to="/intelligence" variant="secondary">
                eport Intelligence
                <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </ButtonLink>
            }
          />
        </Reveal>
        <Reveal>
          <IndicatorPanel areaCode="WLD" areaName="World" />
        </Reveal>
      </Section>
      <LatestNews />
      <HowItWorks />
      <Roadmap />
      <Trust />
      <Faq />
      <ContactSection />
    </>
  );
}
