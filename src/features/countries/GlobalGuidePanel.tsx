/**
 * The worldwide export/import framework, shown on every country page.
 * It is country-agnostic on purpose: each stage lists the questions to answer for this country
 * and the kind of body that usually handles it, and the panel offers only official pages that
 * were verified to exist for the country (scripts/fetch-portals.ts).
 */
import { CircleAlert, ExternalLink as ExternalIcon, FileText, Globe2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { Reveal } from '@/components/common/motion';
import { cn, ExternalLink } from '@/components/common/primitives';
import { Badge, VerificationBadge } from '@/components/common/StatusBadge';
import { ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import type { Country } from '@/types/schemas';
import { formatDate } from '@/utils/format';
import { GLOBAL_FINDERS, PORTAL_URLS } from './portals';

type Mode = 'all' | 'export' | 'import';
const MODES: Array<[Mode, string]> = [
  ['all', 'All stages'],
  ['export', 'Exporting'],
  ['import', 'Importing'],
];

export function GlobalGuidePanel({ country, hasCountryGuide }: { country: Country; hasCountryGuide: boolean }) {
  const { locale } = useI18n();
  const uid = useId();
  const guide = useDataset('global-guide');
  const portals = useDataset('portals');
  const orgs = useDataset('organizations');
  const [mode, setMode] = useState<Mode>('all');

  if (guide.error) return <ErrorState error={guide.error} onRetry={guide.reload} />;
  if (!guide.data) return <LoadingBlock lines={5} />;
  const g = guide.data;
  const stages = g.stages.filter((s) => mode === 'all' || s.appliesTo === 'both' || s.appliesTo === mode);
  const verified = portals.data?.countries[country.cca2];
  const orgName = new Map((orgs.data ?? []).map((o) => [o.id, o.abbreviation ?? o.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <VerificationBadge status={g.status} />
        <span className="text-sm text-muted">eport editorial framework · applies to every country · drafted {formatDate(g.draftedOn, locale)}</span>
      </div>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink">
        {hasCountryGuide ? `The country overview above is specific to ${country.name}. ` : `eport has not yet published ${country.name}’s own procedures. `}
        {g.intro}
      </p>
      <div role="note" className="mt-4 flex gap-3 rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm leading-relaxed text-ink">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warn" />
        <p>
          <strong className="font-semibold text-heading">Read this first. </strong>
          {g.limits}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Globe2 aria-hidden="true" className="size-5 text-link" />
          Official pages for {country.name}
        </h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {verified?.wtoProfile && (
            <li>
              <ExternalLink href={PORTAL_URLS.wtoProfile(country.cca2)} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-soft">
                <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  WTO trade profile (PDF)
                  <span className="block text-xs text-muted">World Trade Organization — tariffs, trade flows and policy indicators</span>
                </span>
              </ExternalLink>
            </li>
          )}
          {verified?.wits && (
            <li>
              <ExternalLink href={PORTAL_URLS.wits(country.cca3)} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-soft">
                <ExternalIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  WITS country profile
                  <span className="block text-xs text-muted">World Bank — trade summary, tariff and partner data</span>
                </span>
              </ExternalLink>
            </li>
          )}
          {GLOBAL_FINDERS.map((f) => (
            <li key={f.url}>
              <ExternalLink href={f.url} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-soft">
                <ExternalIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  {f.label}
                  <span className="block text-xs text-muted">{f.by}</span>
                </span>
              </ExternalLink>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {verified ? 'Country-specific links were checked on ' + formatDate(portals.data!.checkedOn, locale) + '.' : `No country-specific official page could be confirmed for ${country.name}, so none is shown.`} Find{' '}
          {country.name}’s customs administration through the WCO members list; eport does not guess web addresses.
        </p>
      </div>

      <div role="group" aria-label={`Show stages for ${country.name}`} className="mt-7 inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
        {MODES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={cn('min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors', mode === value ? 'bg-ocean text-white shadow' : 'text-ink hover:bg-soft')}
          >
            {label}
          </button>
        ))}
      </div>
      <p role="status" className="tabular mt-3 text-xs text-muted">
        {stages.length} of {g.stages.length} stages shown
      </p>

      <ol className="relative mt-4 space-y-5 border-s-2 border-line ps-8">
        {stages.map((s, i) => (
          <li key={`${uid}-${s.id}`} className="relative">
            <Reveal delay={Math.min(i, 4) * 60}>
              <span aria-hidden="true" className="absolute -start-[2.85rem] top-4 grid size-9 place-items-center rounded-full border-2 border-link bg-page font-display text-sm font-bold text-link">
                {i + 1}
              </span>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">
                    <span className="sr-only">Stage {i + 1}: </span>
                    {s.title}
                  </h3>
                  <Badge tone={s.appliesTo === 'both' ? 'neutral' : 'info'}>{s.appliesTo === 'both' ? 'Exports and imports' : s.appliesTo === 'export' ? 'Exports' : 'Imports'}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink">{s.summary}</p>
                <h4 className="mt-4 text-sm font-semibold text-heading">What to find out for {country.name}</h4>
                <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-ink marker:text-link">
                  {s.lookFor.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-ink">
                  <span className="font-semibold text-heading">Usually handled by: </span>
                  {s.whoTypically}
                </p>
                {s.id === 'commercial-terms' && (
                  <p className="mt-3 text-sm">
                    <Link to="/academy/incoterms" className="font-semibold text-link hover:text-link-hover">
                      Compare the eleven Incoterms® 2020 rules →
                    </Link>
                  </p>
                )}
                {s.orgIds.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="International organizations that explain this stage">
                    {s.orgIds.map((id) => (
                      <li key={id}>
                        <Link to={`/directory/organizations/${id}`} className="inline-flex rounded-full border border-line bg-soft px-3 py-1.5 text-xs font-semibold text-heading hover:text-link">
                          {orgName.get(id) ?? id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
