import { Check, CircleDashed, Info } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { IndicatorPanel } from '@/components/charts/IndicatorPanel';
import { seoCrumbs } from '@/components/common/PageHeader';
import { Provenance } from '@/components/common/Provenance';
import { ButtonLink, FactList } from '@/components/common/primitives';
import { RelatedPanel } from '@/components/common/RelatedPanel';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { SectionNav, type NavSection } from '@/components/navigation/SectionNav';
import { AuthorityCard } from '@/features/directory/AuthorityCard';
import { VideoShelf } from '@/features/videos/VideoShelf';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import type { Country, CountryCoverage } from '@/types/schemas';
import { makeRef } from '@/utils/entities';
import { CountryHero } from './CountryHero';
import { ExchangeRateCard } from './ExchangeRateCard';
import { GuideStepper } from './GuideStepper';
import { WorkingDays } from './WorkingDays';

const SECTIONS: NavSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'indicators', label: 'Trade indicators' },
  { id: 'guide', label: 'Process guide' },
  { id: 'authorities', label: 'Authorities' },
  { id: 'calendar', label: 'Working days' },
  { id: 'videos', label: 'Videos' },
  { id: 'connected', label: 'Connected records' },
];

function Heading({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h2 id={`${id}-heading`} className="text-2xl font-bold">
        {title}
      </h2>
      {lead && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

function CoverageLists({ country, entry }: { country: Country; entry: CountryCoverage['countries'][string] }) {
  return (
    <div className="mt-10 grid gap-6 rounded-2xl border border-line bg-soft p-5 sm:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-heading">Published for {country.name} now</h3>
        <ul className="mt-2 space-y-2">
          {entry.available.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-ink">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ok" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-heading">Being researched — not yet published</h3>
        <ul className="mt-2 space-y-2">
          {entry.pending.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-muted">
              <CircleDashed aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function CountryPage() {
  const code = (useParams().code ?? '').toUpperCase();
  const countries = useDataset('countries');
  const coverage = useDataset('coverage');
  const guides = useDataset('guides');
  const authorities = useDataset('authorities-in');
  const country = countries.data?.find((c) => c.cca2 === code || c.cca3 === code);
  const { hash } = useLocation();
  // Deep links such as /countries/IN#guide: the sections only exist once the data has loaded.
  useEffect(() => {
    if (!country || !hash) return;
    const target = decodeURIComponent(hash.slice(1));
    // Content above the section (map, indicators) finishes loading after the first paint and pushes it
    // down, so align a few times while the layout settles — and stop as soon as the visitor scrolls.
    let userScrolled = false;
    const stop = () => (userScrolled = true);
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchmove', stop, { passive: true });
    const align = () => !userScrolled && document.getElementById(target)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    const timers = [50, 600, 1500].map((ms) => window.setTimeout(align, ms));
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
    };
  }, [country, hash]);
  const path = `/countries/${country?.cca2 ?? code}`;
  const crumbs = [{ label: 'Countries', path: '/countries' }, { label: country?.name ?? code }];

  useSeo({
    title: country ? `${country.name} — trade profile, indicators and authorities` : 'Country profile',
    description: country
      ? `${country.name} (${country.cca2}, ${country.cca3}): map, ISO identifiers, World Bank trade indicators, public holidays, reference exchange rate and linked trade authorities.`
      : 'Country trade profile on eport.',
    path,
    breadcrumbs: seoCrumbs(crumbs, path),
    noindex: !country,
  });

  const error = countries.error ?? coverage.error;
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState error={error} onRetry={() => (countries.reload(), coverage.reload())} />
      </div>
    );
  }
  if (!countries.data || !coverage.data) {
    return (
      <div className="container-page py-16">
        <LoadingBlock lines={8} className="max-w-2xl" />
      </div>
    );
  }
  if (!country) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title={`No country has the code “${code}”`}
          description="eport uses ISO 3166-1 alpha-2 codes in country addresses, for example /countries/IN."
          action={<ButtonLink to="/countries">Browse all countries</ButtonLink>}
        />
      </div>
    );
  }

  const entry = coverage.data.countries[country.cca2];
  const level = entry?.level ?? coverage.data.defaultLevel;
  const guide = guides.data?.find((g) => g.countryCode === country.cca2);
  const countryAuthorities = (authorities.data ?? []).filter((a) => a.jurisdiction === country.cca2 && a.publicationStatus === 'published');
  const byAlpha3 = new Map(countries.data.map((c) => [c.cca3, c]));
  const neighbours = country.borders.map((b) => byAlpha3.get(b)).filter((c): c is Country => Boolean(c));

  return (
    <>
      <CountryHero country={country} countries={countries.data} level={level} coverage={entry} crumbs={crumbs} authorityCount={countryAuthorities.length} />
      <SectionNav sections={SECTIONS} />

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-20">
          <section id="overview" aria-labelledby="overview-heading" className="scroll-mt-36">
            <Heading id="overview" title="Overview" lead="Reference facts from an openly licensed dataset. They identify the country; they say nothing about trade rules." />
            <FactList
              items={[
                { label: 'Official name', value: country.officialName },
                { label: 'ISO 3166-1 alpha-2', value: <span className="tabular">{country.cca2}</span> },
                { label: 'ISO 3166-1 alpha-3', value: <span className="tabular">{country.cca3}</span> },
                { label: 'ISO 3166-1 numeric', value: <span className="tabular">{country.ccn3 ?? 'Not assigned'}</span> },
                { label: 'Region', value: [country.region, country.subregion].filter(Boolean).join(' — ') },
                { label: 'Capital', value: country.capital.join(', ') || '—' },
                { label: 'Currency', value: country.currencies.map((c) => `${c.name} (${c.code})`).join(', ') || '—' },
                { label: 'Languages', value: country.languages.join(', ') || '—' },
                { label: 'UN member state', value: country.unMember ? 'Yes' : 'No' },
                { label: 'Coastline', value: country.landlocked ? 'Landlocked' : 'Has a coastline' },
              ]}
            />
            {neighbours.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm text-muted">Land borders</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {neighbours.map((n) => (
                    <li key={n.cca2}>
                      <Link to={`/countries/${n.cca2}`} className="inline-flex min-h-8 items-center rounded-full border border-line px-3 text-sm text-heading hover:border-link hover:text-link">
                        {n.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section id="indicators" aria-labelledby="indicators-heading" className="scroll-mt-36">
            <Heading id="indicators" title="Trade and economic indicators" />
            <IndicatorPanel areaCode={country.cca3} areaName={country.name} />
          </section>

          <section id="guide" aria-labelledby="guide-heading" className="scroll-mt-36">
            <Heading id="guide" title={`Exporting and importing: ${country.name}`} />
            {guide ? (
              <GuideStepper guide={guide} countryName={country.name} />
            ) : (
              <div className="flex gap-3 rounded-2xl border border-line bg-soft p-5">
                <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-link" />
                <div className="text-sm leading-relaxed text-ink">
                  <p>
                    eport has not yet published export or import procedures, required documents or product rules for {country.name}. This page is a reference record: identifiers, indicators and any
                    linked organizations.
                  </p>
                  <p className="mt-2 font-medium text-heading">The absence of a requirement here does not mean no requirement exists. Confirm with the country’s customs and trade authorities.</p>
                </div>
              </div>
            )}
            {entry && <CoverageLists country={country} entry={entry} />}
          </section>

          <section id="authorities" aria-labelledby="authorities-heading" className="scroll-mt-36">
            <Heading id="authorities" title={`Official authorities for ${country.name}`} lead="Each links to its directory page and its official website. Official authorities are listed apart from commercial service providers." />
            {authorities.status === 'loading' ? (
              <LoadingBlock lines={3} />
            ) : countryAuthorities.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {countryAuthorities.map((a) => (
                  <li key={a.id}>
                    <AuthorityCard authority={a} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title={`No authorities are published for ${country.name} yet`}
                description="eport adds one market at a time, starting with India. Check the country’s customs administration and trade ministry directly."
                action={<ButtonLink to="/directory/authorities" variant="secondary">Browse the directory</ButtonLink>}
              />
            )}
          </section>

          <section id="calendar" aria-labelledby="calendar-heading" className="scroll-mt-36">
            <Heading id="calendar" title="Working days" lead="Useful when planning clearance and delivery dates. Always confirm with the customs office and carrier." />
            <WorkingDays country={country} />
          </section>

          <section id="videos" aria-labelledby="videos-heading" className="scroll-mt-36">
            <Heading id="videos" title="Official explainer videos" lead={`General explainers from international organizations — not specific to ${country.name}. They play from YouTube only when you press play.`} />
            <VideoShelf topics={['customs', 'exporting', 'trade-rules']} limit={3} />
            <p className="mt-4 text-sm">
              <Link to="/academy/videos" className="link">
                All videos
              </Link>
            </p>
          </section>

          <section id="connected" className="scroll-mt-36">
            <RelatedPanel entityRef={makeRef('country', country.cca2)} emptyHint={`No authorities or organizations are linked to ${country.name} yet. Records are added as they are sourced.`} />
          </section>
        </div>

        <div className="space-y-5 lg:sticky lg:top-36 lg:self-start">
          <ExchangeRateCard country={country} />
          <Provenance
            sourceIds={[...country.sourceIds, ...(guide ? guide.sourceIds : [])]}
            note="Identifiers and reference facts come from an openly licensed dataset. Names follow that dataset and do not express a position on the status of any territory."
          />
        </div>
      </div>
    </>
  );
}
