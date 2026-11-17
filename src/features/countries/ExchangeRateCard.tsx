/**
 * Live reference exchange rate for a country's currency against the US dollar.
 * The only live third-party request on a country page; the browser sends the two
 * currency codes and nothing else.
 */
import { Banknote } from 'lucide-react';
import { ExternalLink } from '@/components/common/primitives';
import { Badge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/feedback/states';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { ApiError } from '@/services/api/http';
import { referenceRate } from '@/services/api/providers/frankfurter';
import type { Country } from '@/types/schemas';
import { formatDate, formatRate } from '@/utils/format';

const ERROR_TEXT: Record<string, string> = {
  timeout: 'The rate provider did not respond in time.',
  network: 'The rate provider could not be reached. You may be offline.',
  'rate-limited': 'The rate provider is limiting requests right now. Try again later.',
  'not-found': 'The rate provider has no data for this currency.',
  http: 'The rate provider returned an error.',
  'invalid-response': 'The rate provider returned data eport could not validate, so it is not shown.',
};

export function ExchangeRateCard({ country }: { country: Country }) {
  const { locale } = useI18n();
  const currency = country.currencies[0];
  const code = currency?.code ?? '';
  const rate = useAsync(`fx:${code}`, async () => (code && code !== 'USD' ? referenceRate('USD', code) : null));

  return (
    <section aria-labelledby="fx-heading" className="rounded-lg border border-line bg-white p-5">
      <h2 id="fx-heading" className="flex items-center gap-2 text-sm font-bold">
        <Banknote aria-hidden="true" className="size-4 text-ocean" />
        Reference exchange rate
      </h2>

      <div className="mt-3 min-h-16">
        {!currency && <p className="text-sm text-muted">No currency is recorded for this territory.</p>}
        {code === 'USD' && <p className="text-sm text-muted">The US dollar is this economy's currency and eport's base currency for reference rates.</p>}
        {currency && code !== 'USD' && rate.status === 'loading' && (
          <div role="status">
            <span className="sr-only">Loading reference rate</span>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
        )}
        {rate.status === 'error' && (
          <div role="alert">
            <p className="text-sm text-bad">{rate.error instanceof ApiError ? ERROR_TEXT[rate.error.kind] : 'The reference rate could not be loaded.'}</p>
            <button type="button" onClick={rate.reload} className="link mt-1 text-sm">
              Try again
            </button>
          </div>
        )}
        {rate.status === 'ready' && currency && code !== 'USD' && rate.data === null && (
          <p className="text-sm text-muted">
            {currency.name} ({code}) is not covered by this provider. eport does not substitute a rate from an unverified source.
          </p>
        )}
        {rate.status === 'ready' && rate.data && (
          <>
            <p className="tabular font-display text-2xl font-bold text-navy">
              1 USD = {formatRate(rate.data.rate, locale)} {rate.data.quote}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>
                {currency?.name} · rate dated {formatDate(rate.data.observedOn, locale)}
              </span>
              {rate.data.stale && <Badge tone="warn">Cached — refresh failed</Badge>}
            </p>
          </>
        )}
      </div>

      <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">
        Central-bank reference rate via <ExternalLink href="https://frankfurter.dev/">Frankfurter</ExternalLink>. Indicative only — not a bank, card or customs valuation rate.
      </p>
    </section>
  );
}
