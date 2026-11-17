import { CircleAlert, RefreshCw, SearchX, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, cn } from '@/components/common/primitives';
import { useI18n } from '@/i18n';
import { DataError } from '@/services/data/loader';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton', className)} />;
}

/** Announces loading to assistive technology while showing skeleton placeholders. */
export function LoadingBlock({ lines = 4, label, className }: { lines?: number; label?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" className={cn('space-y-3', className)}>
      <span className="sr-only">{label ?? t('state.loading')}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">{t('state.loading')}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-line p-5">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}
export function EmptyState({ title, description, icon: Icon = SearchX, action, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-lg border border-dashed border-line bg-soft px-6 py-10 text-center', className)}>
      <Icon aria-hidden="true" className="mx-auto size-7 text-muted" />
      <p className="mt-3 font-display text-base font-semibold text-heading">{title}</p>
      {description && <div className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  error?: Error;
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}
export function ErrorState({ error, title, description, onRetry, className }: ErrorStateProps) {
  const { t } = useI18n();
  const detail =
    description ??
    (error instanceof DataError && error.kind === 'schema' ? t('state.errorSchema') : error instanceof DataError ? t('state.errorNetwork') : error?.message);
  return (
    <div role="alert" className={cn('rounded-lg border border-bad/30 bg-bad-soft px-5 py-4', className)}>
      <div className="flex items-start gap-3">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-bad" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-bad">{title ?? t('state.errorTitle')}</p>
          {detail && <p className="mt-1 text-sm text-ink">{detail}</p>}
          {onRetry && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              <RefreshCw aria-hidden="true" className="size-4" />
              {t('state.retry')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
