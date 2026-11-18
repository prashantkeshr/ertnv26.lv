/** Trade glossary: filter-as-you-type, A–Z grouped, with cross-references between terms. */
import { CircleAlert, Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { VerificationBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { formatDate } from '@/utils/format';

export default function GlossaryPage() {
  const { locale } = useI18n();
  const data = useDataset('glossary');
  const uid = useId();
  const [query, setQuery] = useState('');

  useSeo({
    title: 'Trade glossary — customs, shipping and trade terms in plain language',
    description: 'Plain-language definitions of HS codes, Incoterms, customs value, rules of origin, bills of lading, letters of credit and other international trade terms.',
    path: '/academy/glossary',
  });

  const terms = data.data?.terms;
  const byId = useMemo(() => new Map((terms ?? []).map((t) => [t.id, t])), [terms]);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (terms ?? []).filter((t) => !q || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
    const sorted = [...list].sort((a, b) => a.term.localeCompare(b.term, locale));
    const out = new Map<string, typeof sorted>();
    for (const t of sorted) {
      const letter = t.term[0]!.toUpperCase();
      out.set(letter, [...(out.get(letter) ?? []), t]);
    }
    return { out, count: list.length };
  }, [terms, query, locale]);

  if (data.error) {
    return (
      <div className="container-page py-16">
        <ErrorState error={data.error} onRetry={data.reload} />
      </div>
    );
  }
  if (!data.data) {
    return (
      <div className="container-page py-16">
        <LoadingBlock lines={8} className="max-w-2xl" />
      </div>
    );
  }
  const d = data.data;

  return (
    <>
      <header className="hero-bg relative isolate overflow-hidden text-white">
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-80" />
        <div className="container-page pt-8 pb-12 sm:pt-10">
          <Breadcrumbs items={[{ label: 'Academy', path: '/academy' }, { label: 'Glossary' }]} />
          <p className="rise text-xs font-semibold tracking-[0.14em] text-sky uppercase" style={{ '--d': '0ms' } as React.CSSProperties}>
            eport Academy
          </p>
          <h1 className="rise mt-2 text-4xl leading-tight font-extrabold text-white sm:text-5xl" style={{ '--d': '80ms' } as React.CSSProperties}>
            Trade glossary
          </h1>
          <p className="rise mt-5 max-w-2xl text-base leading-relaxed text-white/85" style={{ '--d': '160ms' } as React.CSSProperties}>
            {d.terms.length} terms from customs, shipping and trade finance, in plain language.
          </p>
          <div className="rise mt-6 flex flex-wrap items-center gap-3" style={{ '--d': '240ms' } as React.CSSProperties}>
            <VerificationBadge status={d.status} />
            <span className="text-sm text-white/75">eport editorial definitions · drafted {formatDate(d.draftedOn, locale)}</span>
          </div>
        </div>
      </header>

      <div className="container-page max-w-4xl space-y-8 py-12">
        <div role="note" className="flex gap-3 rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm leading-relaxed text-ink">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warn" />
          <p>
            <strong className="font-semibold text-heading">Read this first. </strong>
            {d.limits}
          </p>
        </div>

        <div>
          <label htmlFor={`${uid}-q`} className="text-sm font-semibold text-heading">
            Filter terms
          </label>
          <div className="relative mt-2">
            <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id={`${uid}-q`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="For example: origin, invoice, insurance"
              className="min-h-11 w-full rounded-xl border border-line bg-surface ps-10 pe-3 text-sm text-heading placeholder:text-muted"
            />
          </div>
          <p role="status" className="tabular mt-2 text-xs text-muted">
            {groups.count} of {d.terms.length} terms shown
          </p>
        </div>

        {groups.count === 0 ? (
          <EmptyState title={`No term matches “${query}”`} description="Try a shorter word, or clear the filter." />
        ) : (
          [...groups.out.entries()].map(([letter, list]) => (
            <section key={letter} aria-labelledby={`${uid}-${letter}`}>
              <h2 id={`${uid}-${letter}`} className="border-b border-line pb-2 font-display text-2xl font-bold text-link">
                {letter}
              </h2>
              <dl className="mt-4 space-y-6">
                {list.map((t) => (
                  <div key={t.id} id={t.id} className="scroll-mt-28">
                    <dt className="text-base font-bold text-heading">{t.term}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-ink">
                      {t.definition}
                      {t.seeAlso.length > 0 && (
                        <span className="mt-2 block text-xs text-muted">
                          See also:{' '}
                          {t.seeAlso.map((id, i) => (
                            <span key={id}>
                              {i > 0 && ', '}
                              <a href={`#${id}`} onClick={() => setQuery('')} className="font-semibold text-link hover:text-link-hover">
                                {byId.get(id)?.term ?? id}
                              </a>
                            </span>
                          ))}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))
        )}
      </div>
    </>
  );
}
