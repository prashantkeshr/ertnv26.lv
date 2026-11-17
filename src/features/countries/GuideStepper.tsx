/**
 * A country's export/import process guide as a numbered timeline, filterable by direction.
 * The guide is an eport editorial overview and is labelled as such, with its review status,
 * its limits, and each step's responsible authorities linked to their directory pages and
 * official websites.
 */
import { ArrowUpRight, CircleAlert } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Reveal } from '@/components/common/motion';
import { cn, hostOf } from '@/components/common/primitives';
import { Badge, VerificationBadge } from '@/components/common/StatusBadge';
import { useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import type { CountryGuide } from '@/types/schemas';
import { formatDate } from '@/utils/format';

type Mode = 'all' | 'export' | 'import';
const MODES: Array<[Mode, string]> = [
  ['all', 'All steps'],
  ['export', 'Exporting'],
  ['import', 'Importing'],
];

export function GuideStepper({ guide, countryName }: { guide: CountryGuide; countryName: string }) {
  const { locale } = useI18n();
  const uid = useId();
  const authorities = useDataset('authorities-in');
  const [mode, setMode] = useState<Mode>('all');
  const byId = useMemo(() => new Map((authorities.data ?? []).map((a) => [a.id, a])), [authorities.data]);
  const steps = guide.steps.filter((s) => mode === 'all' || s.appliesTo === 'both' || s.appliesTo === mode);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <VerificationBadge status={guide.status} />
        <span className="text-sm text-muted">eport editorial overview · drafted {formatDate(guide.draftedOn, locale)}</span>
      </div>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink">{guide.intro}</p>
      <div role="note" className="mt-4 flex gap-3 rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm leading-relaxed text-ink">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warn" />
        <p>
          <strong className="font-semibold text-heading">Read this first. </strong>
          {guide.limits}
        </p>
      </div>

      <div role="group" aria-label={`Show steps for ${countryName}`} className="mt-7 inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
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
        {steps.length} of {guide.steps.length} steps shown
      </p>

      <ol className="relative mt-4 space-y-5 border-s-2 border-line ps-8">
        {steps.map((step, i) => (
          <li key={`${uid}-${step.id}`} className="relative">
            <Reveal delay={Math.min(i, 4) * 60}>
              <span aria-hidden="true" className="absolute -start-[2.85rem] top-4 grid size-9 place-items-center rounded-full border-2 border-link bg-page font-display text-sm font-bold text-link">
                {i + 1}
              </span>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <Badge tone={step.appliesTo === 'both' ? 'neutral' : 'info'}>{step.appliesTo === 'both' ? 'Exports and imports' : step.appliesTo === 'export' ? 'Exports' : 'Imports'}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink">{step.summary}</p>
                {step.authorityIds.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Responsible authorities">
                    {step.authorityIds.map((id) => {
                      const a = byId.get(id);
                      if (!a) return null;
                      return (
                        <li key={id} className="inline-flex items-center overflow-hidden rounded-full border border-line bg-soft text-xs font-semibold">
                          <Link to={`/directory/authorities/${a.id}`} className="px-3 py-1.5 text-heading hover:text-link">
                            {a.abbreviation ?? a.name}
                          </Link>
                          <a href={a.website} target="_blank" rel="noopener noreferrer" className="border-s border-line px-2 py-1.5 text-muted hover:text-link" title={`Official website: ${hostOf(a.website)}`}>
                            <ArrowUpRight aria-hidden="true" className="size-3.5" />
                            <span className="sr-only">
                              {a.abbreviation ?? a.name} official website ({hostOf(a.website)}, opens in a new tab)
                            </span>
                          </a>
                        </li>
                      );
                    })}
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
