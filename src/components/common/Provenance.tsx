/**
 * Provenance panel shown on every sourced record: who published the underlying
 * information, what kind of source it is, and what eport has (and has not) verified.
 */
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import type { SourceType, Verification } from '@/types/schemas';
import { formatDate } from '@/utils/format';
import { ExternalLink } from './primitives';
import { VerificationBadge } from './StatusBadge';

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  'official-government': 'Official government source',
  'international-organization': 'Official international organization',
  'official-operator': 'Official operator or regulator',
  'statutory-organization': 'Recognized statutory or standards organization',
  'licensed-data-provider': 'Openly licensed data provider',
  'research-organization': 'Research organization',
  'secondary-publication': 'Secondary publication (context only)',
};

const METHOD_TEXT: Record<Verification['method'], string> = {
  'automated-link-check': 'Official link confirmed reachable',
  'editorial-review': 'Content reviewed against the source',
  none: 'Not yet checked',
};

interface ProvenanceProps {
  sourceIds: string[];
  verification?: Verification;
  /** Extra statement, e.g. that a summary is eport's own wording. */
  note?: string;
}

export function Provenance({ sourceIds, verification, note }: ProvenanceProps) {
  const { locale } = useI18n();
  const sources = useDataset('sources');
  const matched = sources.data?.filter((s) => sourceIds.includes(s.id)) ?? [];

  return (
    <aside aria-labelledby="provenance-heading" className="rounded-lg border border-line bg-soft p-5">
      <h2 id="provenance-heading" className="flex items-center gap-2 text-sm font-bold">
        <ShieldCheck aria-hidden="true" className="size-4 text-link" />
        Source and verification
      </h2>

      {verification && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <VerificationBadge status={verification.status} />
          <span className="text-muted">
            {METHOD_TEXT[verification.method]}
            {verification.lastChecked && <> · {formatDate(verification.lastChecked, locale)}</>}
          </span>
        </div>
      )}
      {verification?.note && <p className="mt-2 text-sm text-warn">{verification.note}</p>}

      <ul className="mt-4 space-y-3">
        {sources.status === 'loading' && (
          <li>
            <Skeleton className="h-4 w-3/4" />
          </li>
        )}
        {sources.status === 'error' && <li className="text-sm text-bad">The source registry could not be loaded.</li>}
        {matched.map((s) => (
          <li key={s.id} className="text-sm">
            <ExternalLink href={s.url} className="font-medium">
              {s.title}
            </ExternalLink>
            <p className="mt-0.5 text-muted">
              {s.publisher} · {SOURCE_TYPE_LABEL[s.sourceType]}
              {s.license && <> · {s.license}</>}
            </p>
          </li>
        ))}
      </ul>

      {note && <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">{note}</p>}
      <p className="mt-3 text-xs text-muted">
        <Link to="/methodology" className="link">
          How eport labels sources and verification
        </Link>
      </p>
    </aside>
  );
}
