/**
 * Quick Finder — "your starting points in seconds".
 * Pick export or import and a country; eport lists the official authorities it has published
 * for that country that typically matter for that direction. Results update instantly from the
 * published authority dataset. They are starting points, not a list of requirements.
 */
import { ArrowUpRight, Compass } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Flag } from '@/components/common/Flag';
import { Reveal } from '@/components/common/motion';
import { buttonClass, cn, hostOf, inputClass, Kicker, Section } from '@/components/common/primitives';
import { Badge, VerificationBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import type { Authority, AuthorityCategory } from '@/types/schemas';
import { AUTHORITY_CATEGORY_LABEL } from '@/utils/labels';

export type Direction = 'export' | 'import';

/** Editorial mapping: which kinds of authority people usually deal with for each direction. */
export const TYPICAL_CATEGORIES: Record<Direction, AuthorityCategory[]> = {
  export: ['trade-regulator', 'trade-ministry', 'customs', 'single-window', 'export-promotion', 'inspection', 'plant-health', 'foreign-exchange', 'export-credit', 'tax', 'trade-portal'],
  import: ['trade-regulator', 'trade-ministry', 'customs', 'single-window', 'tax', 'food-safety', 'plant-health', 'pharmaceutical-regulator', 'standards', 'foreign-exchange', 'trade-portal'],
};

export function startingPoints(authorities: Authority[], country: string, direction: Direction): Authority[] {
  const wanted = TYPICAL_CATEGORIES[direction];
  return authorities
    .filter((a) => a.jurisdiction === country && a.publicationStatus === 'published' && wanted.includes(a.category))
    .sort((a, b) => wanted.indexOf(a.category) - wanted.indexOf(b.category) || a.name.localeCompare(b.name));
}

export function QuickFinder() {
  const uid = useId();
  const countries = useDataset('countries');
  const authorities = useDataset('authorities-in');
  const [direction, setDirection] = useState<Direction>('export');
  const [country, setCountry] = useState('IN');

  const selected = countries.data?.find((c) => c.cca2 === country);
  const results = useMemo(() => (authorities.data ? startingPoints(authorities.data, country, direction) : []), [authorities.data, country, direction]);
  const error = countries.error ?? authorities.error;

  const seg = (active: boolean) =>
    cn('min-h-11 flex-1 cursor-pointer rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors peer-focus-visible:outline-2', active ? 'bg-ocean text-white shadow' : 'text-ink hover:bg-soft');

  return (
    <Section tone="soft" aria-labelledby="finder-heading">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Kicker>Quick finder</Kicker>
        <h2 id="finder-heading" className="text-3xl font-bold sm:text-4xl">
          Find your starting points in seconds
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">Choose what you are doing and where. eport lists the official authorities it has published for that country that typically matter — then sends you to the source.</p>
      </Reveal>

      <Reveal delay={100} className="mx-auto mt-10 max-w-4xl">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_-34px_rgb(11_31_51/0.4)] sm:p-7">
          {error ? (
            <ErrorState error={error} onRetry={() => (countries.reload(), authorities.reload())} />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold text-heading">I want to</legend>
                  <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
                    {(['export', 'import'] as const).map((d) => (
                      <div key={d} className="relative flex flex-1">
                        <input type="radio" id={`${uid}-${d}`} name={`${uid}-dir`} value={d} checked={direction === d} onChange={() => setDirection(d)} className="peer sr-only" />
                        <label htmlFor={`${uid}-${d}`} className={seg(direction === d)}>
                          {d === 'export' ? 'Export goods' : 'Import goods'}
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor={`${uid}-country`} className="mb-1.5 block text-sm font-semibold text-heading">
                    {direction === 'export' ? 'Exporting from' : 'Importing into'}
                  </label>
                  {countries.status === 'ready' ? (
                    <select id={`${uid}-country`} value={country} onChange={(e) => setCountry(e.target.value)} className={cn(inputClass, 'min-h-12')}>
                      {countries.data.map((c) => (
                        <option key={c.cca2} value={c.cca2}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Skeleton className="h-12 w-full" />
                  )}
                </div>
              </div>

              <div aria-live="polite" className="mt-7">
                {authorities.status === 'loading' ? (
                  <Skeleton className="h-32 w-full" />
                ) : selected && results.length > 0 ? (
                  <>
                    <p className="flex items-center gap-2 text-sm font-semibold text-heading">
                      <Flag code={selected.cca2} />
                      {results.length} official authorit{results.length === 1 ? 'y' : 'ies'} to start with — {direction === 'export' ? 'exporting from' : 'importing into'} {selected.name}
                    </p>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                      {results.map((a) => (
                        <li key={a.id} className="flex flex-col rounded-xl border border-line bg-soft p-4">
                          <Link to={`/directory/authorities/${a.id}`} className="font-display text-base font-bold text-heading hover:text-link">
                            {a.abbreviation ? `${a.abbreviation} — ` : ''}
                            {a.name}
                          </Link>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            <Badge tone="info">{AUTHORITY_CATEGORY_LABEL[a.category]}</Badge>
                            <VerificationBadge status={a.verification.status} />
                          </span>
                          <p className="mt-2 text-sm leading-relaxed text-muted">{a.functions[0]}</p>
                          <a href={a.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 self-start text-sm font-semibold text-link hover:text-link-hover">
                            Official website · {hostOf(a.website)}
                            <ArrowUpRight aria-hidden="true" className="size-4" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyState
                    icon={Compass}
                    title={`No authorities are published for ${selected?.name ?? 'this country'} yet`}
                    description="eport adds one market at a time, starting with India. This is not a sign that nothing applies — check the country’s customs and trade authorities directly."
                    action={
                      selected && (
                        <Link to={`/countries/${selected.cca2}`} className={buttonClass('secondary', 'md')}>
                          Open the {selected.name} profile
                        </Link>
                      )
                    }
                  />
                )}
              </div>
              <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted">
                These are starting points, not a list of requirements. What applies depends on your product, its use, origin and destination, and rules change — confirm with the official authority.
              </p>
            </>
          )}
        </div>
      </Reveal>
    </Section>
  );
}
