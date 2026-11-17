import { ArrowRight, BookOpen, FileText, Route, Scale, ShieldCheck, Ship, Waypoints, type LucideIcon } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { DIVISIONS, type ModuleStatus } from '@/app/modules';
import { routeMeta, SITE } from '@/app/route-meta';
import { IndicatorPanel } from '@/components/charts/IndicatorPanel';
import { ButtonLink, Card, Kicker, Section, SectionHeading } from '@/components/common/primitives';
import { CountryLevelBadge, ModuleStatusBadge } from '@/components/common/StatusBadge';
import { ErrorState, Skeleton } from '@/components/feedback/states';
import { DIVISION_ICON } from '@/components/navigation/Header';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { formatDate, formatNumber } from '@/utils/format';

const WorldMap = lazy(() => import('@/components/maps/WorldMap'));

const QUICK_LINKS = [
  { to: '/countries', label: 'Explore countries' },
  { to: '/countries/IN', label: 'India trade profile' },
  { to: '/directory/authorities', label: 'Official authorities' },
  { to: '/directory/organizations', label: 'International organizations' },
];

function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <svg aria-hidden="true" viewBox="0 0 600 600" className="pointer-events-none absolute -end-40 -top-24 hidden h-[640px] w-[640px] text-white/[0.06] lg:block" fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="300" cy="300" r="298" />
        {[60, 120, 180, 240].map((rx) => (
          <ellipse key={rx} cx="300" cy="300" rx={rx} ry="298" />
        ))}
        {[-200, -100, 0, 100, 200].map((dy) => (
          <line key={dy} x1={300 - Math.sqrt(298 ** 2 - dy ** 2)} x2={300 + Math.sqrt(298 ** 2 - dy ** 2)} y1={300 + dy} y2={300 + dy} />
        ))}
      </svg>
      <div className="container-page relative py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <Kicker inverse>{SITE.positioning}</Kicker>
          <h1 className="text-4xl leading-[1.1] font-extrabold text-white sm:text-5xl lg:text-[3.5rem]">
            Connecting Global Trade. <span className="text-sky">Simplifying International Commerce.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Discover markets. Understand regulations. Prepare documentation. Explore maritime intelligence. Connect with global trade opportunities.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchCombobox variant="hero" inputId="hero-search" />
          </div>
          <ul className="mt-5 flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="inline-flex min-h-9 items-center rounded-full border border-white/20 px-3.5 text-sm text-white/85 transition-colors hover:border-white/50 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

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
    <section aria-label="Published coverage" className="border-b border-line bg-white">
      <div className="container-page py-8">
        {manifest.status === 'error' ? (
          <ErrorState error={manifest.error} onRetry={manifest.reload} />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
              {items.map((item) => (
                <div key={item.id} className="border-s-2 border-accent ps-4">
                  <dd className="tabular font-display text-3xl font-bold text-navy">
                    {manifest.status === 'loading' ? <Skeleton className="h-8 w-16" /> : records(item.id) === null ? '—' : formatNumber(records(item.id)!, locale)}
                  </dd>
                  <dt className="mt-1 text-sm text-muted">{item.label}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs text-muted">
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

function Divisions() {
  return (
    <Section aria-labelledby="divisions-heading">
      <SectionHeading
        id="divisions-heading"
        kicker="The platform"
        title="Six connected divisions"
        description="eport is being built in tested stages. Each division shows exactly which of its modules work today and which are still in development."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DIVISIONS.map((d) => {
          const Icon = DIVISION_ICON[d.icon];
          const available = d.modules.filter((m) => m.status === 'live' || m.status === 'foundation').length;
          return (
            <Link key={d.id} to={d.path} className="group flex flex-col rounded-lg border border-line bg-white p-6 transition-colors hover:border-ocean">
              <Icon aria-hidden="true" className="size-6 text-ocean" strokeWidth={1.75} />
              <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{d.kicker}</p>
              <h3 className="mt-1 text-lg font-bold group-hover:text-ocean">{d.purpose}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{d.description}</p>
              <p className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
                <span className="tabular text-muted">
                  {available} of {d.modules.length} modules available
                </span>
                <ArrowRight aria-hidden="true" className="size-4 text-ocean transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
              </p>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

function CountryExploration() {
  const countries = useDataset('countries');
  const coverage = useDataset('coverage');
  const error = countries.error ?? coverage.error;
  const regions = countries.data
    ? [...countries.data.reduce((m, c) => m.set(c.region, (m.get(c.region) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])
    : [];

  return (
    <Section tone="soft" aria-labelledby="map-heading">
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
      {error ? (
        <ErrorState error={error} onRetry={() => (countries.reload(), coverage.reload())} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
          <div>
            {countries.data && coverage.data ? (
              <Suspense fallback={<Skeleton className="aspect-[96/50] w-full rounded-lg" />}>
                <WorldMap countries={countries.data} coverage={coverage.data} />
              </Suspense>
            ) : (
              <Skeleton className="aspect-[96/50] w-full rounded-lg" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold">By region</h3>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {regions.map(([region, count]) => (
                <li key={region}>
                  <Link to={`/countries?region=${encodeURIComponent(region)}`} className="group flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium text-navy group-hover:text-ocean">{region}</span>
                    <span className="tabular text-muted">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Card className="mt-6 p-4">
              <p className="text-xs font-semibold tracking-[0.14em] text-ocean uppercase">Reference market</p>
              <p className="mt-1 font-display font-bold text-navy">India</p>
              <div className="mt-2">
                <CountryLevelBadge level="operational-seed" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">The first market being documented in operational depth, starting with its national trade authorities.</p>
              <Link to="/countries/IN" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-dark">
                Open India profile <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </Link>
            </Card>
          </div>
        </div>
      )}
    </Section>
  );
}

const TASKS: Array<{ icon: LucideIcon; title: string; text: string; to: string; cta: string; status: ModuleStatus }> = [
  { icon: BookOpen, title: 'Learn to export or import', text: 'Step-by-step Export and Import Academy pathways, from choosing a product to reconciling payment.', to: '/academy', cta: 'eport Academy', status: 'planned' },
  { icon: FileText, title: 'Understand trade documents', text: 'What each document is, who prepares and issues it, what it depends on, and when it actually applies.', to: '/academy', cta: 'Documentation Centre', status: 'planned' },
  { icon: Route, title: 'Plan a shipment', text: 'The Smart Trade Navigator will turn a shipment description into a preliminary, source-linked action plan.', to: '/trade-desk', cta: 'eport Trade Desk', status: 'planned' },
  { icon: Ship, title: 'Track cargo and vessels', text: 'Routing to official carrier tracking pages, and vessel information where a data provider permits it.', to: '/intelligence', cta: 'eport Intelligence', status: 'planned' },
];

function Tasks() {
  return (
    <Section tone="soft" aria-labelledby="tasks-heading">
      <SectionHeading
        id="tasks-heading"
        kicker="Where this is going"
        title="Tools being built next"
        description="These modules are in development. They are listed so you can see the plan — nothing here pretends to work before it does."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TASKS.map((task) => (
          <Card key={task.title} className="flex flex-col p-5">
            <task.icon aria-hidden="true" className="size-6 text-ocean" strokeWidth={1.75} />
            <h3 className="mt-4 text-base font-bold">{task.title}</h3>
            <div className="mt-2">
              <ModuleStatusBadge status={task.status} />
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{task.text}</p>
            <Link to={task.to} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-dark">
              {task.cta} <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </Link>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function Organizations() {
  const orgs = useDataset('organizations');
  return (
    <Section aria-labelledby="orgs-heading">
      <SectionHeading
        id="orgs-heading"
        kicker="eport Directory"
        title="The bodies that shape trade rules"
        description="Intergovernmental, UN-system, treaty and private organizations — kept clearly apart, each linked to its official website."
        action={
          <ButtonLink to="/directory/organizations" variant="secondary">
            All organizations
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </ButtonLink>
        }
      />
      {orgs.status === 'error' && <ErrorState error={orgs.error} onRetry={orgs.reload} />}
      {orgs.status === 'loading' && <Skeleton className="h-40 w-full rounded-lg" />}
      {orgs.data && (
        <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {orgs.data.map((o) => (
            <li key={o.id} className="bg-white">
              <Link to={`/directory/organizations/${o.id}`} className="group block h-full px-5 py-4 hover:bg-soft">
                <span className="font-display text-lg font-bold text-navy group-hover:text-ocean">{o.abbreviation}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{o.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

const PRINCIPLES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Scale, title: 'Official sources first', text: 'Government authorities, then international organizations, then official operators. Secondary publications are used for context only.' },
  { icon: ShieldCheck, title: 'Every status is labelled', text: 'Records say whether they are reviewed, source-referenced, in need of review or outdated. Requirements are mandatory, conditional, optional or unknown — and unknown never means “not required”.' },
  { icon: Waypoints, title: 'Limits are shown, not hidden', text: 'If data is missing, partial or needs a secure service that a static site cannot provide, eport says so and links to the official source.' },
];

function Trust() {
  return (
    <Section tone="navy" aria-labelledby="trust-heading">
      <SectionHeading
        id="trust-heading"
        inverse
        kicker="Trust and methodology"
        title="Accuracy before completeness"
        description="eport is an independent platform. It is not a government, customs, port or regulatory service, and its guidance is preliminary — never a legal determination."
      />
      <div className="grid gap-8 md:grid-cols-3">
        {PRINCIPLES.map((p) => (
          <div key={p.title}>
            <p.icon aria-hidden="true" className="size-6 text-sky" strokeWidth={1.75} />
            <h3 className="mt-4 text-lg font-bold text-white">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/methodology" variant="inverse">
          Sources and methodology
        </ButtonLink>
        <ButtonLink to="/data-reliability" variant="inverse">
          Data Reliability Centre
        </ButtonLink>
      </div>
    </Section>
  );
}

export default function HomePage() {
  const meta = routeMeta('/');
  useSeo({ title: meta.title, description: meta.description, path: '/' });

  return (
    <>
      <Hero />
      <CoverageStrip />
      <Divisions />
      <CountryExploration />
      <Section aria-labelledby="stats-heading">
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
        <IndicatorPanel areaCode="WLD" areaName="World" />
      </Section>
      <Tasks />
      <Organizations />
      <Trust />
    </>
  );
}
