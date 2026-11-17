/**
 * Status badges. Every badge pairs an icon and a text label with its colour, so status is
 * never conveyed by colour alone (WCAG 1.4.1).
 */
import {
  BadgeCheck,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Clock,
  Construction,
  Link2,
  Lock,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ModuleStatus } from '@/app/modules';
import { useI18n } from '@/i18n';
import type { CoverageLevel, DatasetCoverage, RequirementStatus, VerificationStatus } from '@/types/schemas';
import { cn } from './primitives';

export type Tone = 'ok' | 'info' | 'warn' | 'bad' | 'neutral';

const TONE: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-link-hover',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-soft text-muted ring-1 ring-inset ring-line',
};

export function Badge({ tone = 'neutral', icon: Icon, children, className }: { tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap', TONE[tone], className)}>
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}

const VERIFICATION: Record<VerificationStatus, { tone: Tone; icon: LucideIcon }> = {
  'officially-verified': { tone: 'ok', icon: BadgeCheck },
  'source-referenced': { tone: 'info', icon: Link2 },
  'needs-review': { tone: 'warn', icon: TriangleAlert },
  outdated: { tone: 'bad', icon: Clock },
};
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const { t } = useI18n();
  const v = VERIFICATION[status];
  return (
    <Badge tone={v.tone} icon={v.icon}>
      {t(`status.verification.${status}`)}
    </Badge>
  );
}

const REQUIREMENT: Record<RequirementStatus, { tone: Tone; icon: LucideIcon }> = {
  mandatory: { tone: 'bad', icon: CircleCheck },
  conditional: { tone: 'warn', icon: CircleDashed },
  optional: { tone: 'info', icon: CircleDashed },
  unknown: { tone: 'neutral', icon: CircleHelp },
};
export function RequirementBadge({ status }: { status: RequirementStatus }) {
  const { t } = useI18n();
  const v = REQUIREMENT[status];
  return (
    <Badge tone={v.tone} icon={v.icon}>
      {t(`status.requirement.${status}`)}
    </Badge>
  );
}

const MODULE: Record<ModuleStatus, { tone: Tone; icon: LucideIcon }> = {
  live: { tone: 'ok', icon: CircleCheck },
  foundation: { tone: 'info', icon: CircleCheck },
  planned: { tone: 'neutral', icon: Construction },
  'requires-backend': { tone: 'warn', icon: Lock },
};
export function ModuleStatusBadge({ status }: { status: ModuleStatus }) {
  const { t } = useI18n();
  const v = MODULE[status];
  return (
    <Badge tone={v.tone} icon={v.icon}>
      {t(`status.module.${status}`)}
    </Badge>
  );
}

const COVERAGE: Record<DatasetCoverage, { tone: Tone; icon: LucideIcon }> = {
  verified: { tone: 'ok', icon: BadgeCheck },
  partial: { tone: 'info', icon: CircleDashed },
  seed: { tone: 'warn', icon: CircleDashed },
  unavailable: { tone: 'neutral', icon: Lock },
};
export function CoverageBadge({ coverage }: { coverage: DatasetCoverage }) {
  const { t } = useI18n();
  const v = COVERAGE[coverage];
  return (
    <Badge tone={v.tone} icon={v.icon}>
      {t(`status.coverage.${coverage}`)}
    </Badge>
  );
}

export const COUNTRY_LEVEL_LABEL: Record<CoverageLevel, string> = {
  operational: 'Operational guidance',
  'operational-seed': 'Operational guidance — in progress',
  reference: 'Reference record',
};
export function CountryLevelBadge({ level }: { level: CoverageLevel }) {
  const tone: Tone = level === 'operational' ? 'ok' : level === 'operational-seed' ? 'info' : 'neutral';
  return (
    <Badge tone={tone} icon={level === 'reference' ? CircleDashed : CircleCheck}>
      {COUNTRY_LEVEL_LABEL[level]}
    </Badge>
  );
}
