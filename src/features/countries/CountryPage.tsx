import { Check, CircleDashed, Info } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { IndicatorPanel } from '@/components/charts/IndicatorPanel';
import { Flag } from '@/components/common/Flag';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { Provenance } from '@/components/common/Provenance';
import { ButtonLink, FactList } from '@/components/common/primitives';
import { RelatedPanel } from '@/components/common/RelatedPanel';
import { Badge, CountryLevelBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import type { Country, CountryCoverage } from '@/types/schemas';
import { makeRef } from '@/utils/entities';
import { ExchangeRateCard } from './ExchangeRateCard';

function CoverageSection({ country, coverage }: { country: Country; coverage: CountryCoverage }) {
  const entry = coverage.countries[country.cca2];
  return (
    <section aria-labelledby="coverage-heading">
      <h2 id="coverage-heading" className="text-xl font-bold">
        Export-import guidance for {country.name}
      </h2>
      {entry ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink">{entry.summary}</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-heading">Published now</h3>
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
        </>
      ) : (
        <div className="mt-4 flex gap-3 rounded-lg border border-line bg-soft p-5">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-link" />
          <div className="text-sm leading-relaxed text-ink">
            <p>
              eport has not yet published export or import procedures, required documents or product rules for {country.name}. This page is a reference record: identifiers, indicators and
              any linked organizations.
            </p>
            <p className="mt-2 font-medium text-heading">The absence of a requirement here does not mean no requirement exists. Confirm with the country's customs and trade authorities.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function CountryPage() {
  const code = (useParams().code ?? '').toUpperCase();
  const countries = useDataset('countries');
  const coverage = useDataset('coverage');
  const country = countries.data?.find((c) => c.cca2 === code || c.cca3 === code);
  const path = `/countries/${country?.cca2 ?? code}`;
  const crumbs = [{ label: 'Countries', path: '/countries' }, { label: country?.name ?? code }];

  useSeo({
    title: country ? `${country.name} — trade profile, indicators and authorities` : 'Country profile',
    description: country
      ? `${country.name} (${country.cca2}, ${country.cca3}): ISO identifiers, World Bank trade and economic indicators, reference exchange rate and linked trade authorities.`
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

  const level = coverage.data.countries[country.cca2]?.level ?? coverage.data.defaultLevel;
  const byAlpha3 = new Map(countries.data.map((c) => [c.cca3, c]));
  const neighbours = country.borders.map((b) => byAlpha3.get(b)).filter((c): c is Country => Boolean(c));

  return (
    <>
      <PageHeader crumbs={crumbs} kicker={country.subregion ?? country.region} title={country.name} leading={<Flag code={country.cca2} className="!h-9 !w-12 !rounded-md" />} description={country.officialName !== country.name ? country.officialName : undefined}>
        <Badge tone="neutral" className="tabular">
          ISO {country.cca2} · {country.cca3}
          {country.ccn3 && ` · ${country.ccn3}`}
        </Badge>
        <CountryLevelBadge level={level} />
      </PageHeader>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-14">
          <section aria-labelledby="indicators-heading">
            <h2 id="indicators-heading" className="mb-6 text-xl font-bold">
              Trade and economic indicators
            </h2>
            <IndicatorPanel areaCode={country.cca3} areaName={country.name} />
          </section>

          <CoverageSection country={country} coverage={coverage.data} />

          <RelatedPanel
            entityRef={makeRef('country', country.cca2)}
            emptyHint={`No authorities or organizations are linked to ${country.name} yet. Records are added as they are sourced.`}
          />

          <section aria-labelledby="facts-heading">
            <h2 id="facts-heading" className="mb-3 text-xl font-bold">
              Reference facts
            </h2>
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
              <div className="mt-5">
                <h3 className="text-sm text-muted">Land borders</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {neighbours.map((n) => (
                    <li key={n.cca2}>
                      <Link to={`/countries/${n.cca2}`} className="inline-flex min-h-8 items-center rounded-full border border-line px-3 text-sm text-heading hover:border-ocean hover:text-link">
                        {n.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <ExchangeRateCard country={country} />
          <Provenance
            sourceIds={country.sourceIds}
            note="Identifiers and reference facts come from an openly licensed dataset. Names follow that dataset and do not express a position on the status of any territory."
          />
        </div>
      </div>
    </>
  );
}
