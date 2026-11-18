/**
 * Trade Documentation Centre with document relationships: what each document is, who prepares and
 * issues it, what it draws on and what draws on it, plus a "prepare in this order" view computed
 * from those relations (the build rejects a dependency cycle). Guidance only — no templates.
 */
import { ArrowRight, CircleAlert } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Reveal } from '@/components/common/motion';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { buttonClass, cn } from '@/components/common/primitives';
import { Badge, VerificationBadge } from '@/components/common/StatusBadge';
import { ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { formatDate } from '@/utils/format';
import { documentLevels } from './documentLevels';

export default function DocumentsPage() {
  const { locale } = useI18n();
  const data = useDataset('documents');
  const uid = useId();
  const [category, setCategory] = useState<string>('all');

  useSeo({
    title: 'Trade documents explained — who prepares them and which depend on which',
    description: 'The common documents in an international shipment — invoice, packing list, bill of lading, certificates, customs declarations — what each is for, who prepares or issues it and what to prepare first.',
    path: '/academy/documents',
  });

  const docs = data.data?.documents ?? [];
  const levels = useMemo(() => documentLevels(docs), [docs]);
  const names = useMemo(() => new Map(docs.map((d) => [d.id, d.name])), [docs]);
  const usedBy = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of docs) for (const dep of d.dependsOn) m.set(dep, [...(m.get(dep) ?? []), d.id]);
    return m;
  }, [docs]);

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
  const shown = d.documents.filter((x) => category === 'all' || x.category === category);
  const maxLevel = Math.max(...levels.values());
  const catTitle = new Map(d.categories.map((c) => [c.id, c.title]));

  const chip = (id: string) => (
    <li key={id}>
      <a href={`#doc-${id}`} className="inline-flex rounded-full border border-line bg-soft px-3 py-1.5 text-xs font-semibold text-heading hover:text-link">
        {names.get(id) ?? id}
      </a>
    </li>
  );

  return (
    <>
      <header className="hero-bg relative isolate overflow-hidden text-white">
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-80" />
        <div className="container-page pt-8 pb-12 sm:pt-10">
          <Breadcrumbs items={[{ label: 'Academy', path: '/academy' }, { label: 'Trade documents' }]} />
          <p className="rise text-xs font-semibold tracking-[0.14em] text-sky uppercase" style={{ '--d': '0ms' } as React.CSSProperties}>
            eport Academy
          </p>
          <h1 className="rise mt-2 max-w-3xl text-4xl leading-tight font-extrabold text-white sm:text-5xl" style={{ '--d': '80ms' } as React.CSSProperties}>
            Trade documents, and how they fit together
          </h1>
          <p className="rise mt-5 max-w-2xl text-base leading-relaxed text-white/85" style={{ '--d': '160ms' } as React.CSSProperties}>
            {d.intro}
          </p>
          <div className="rise mt-6 flex flex-wrap items-center gap-3" style={{ '--d': '240ms' } as React.CSSProperties}>
            <VerificationBadge status={d.status} />
            <span className="text-sm text-white/75">eport editorial guide · drafted {formatDate(d.draftedOn, locale)}</span>
          </div>
        </div>
      </header>

      <div className="container-page space-y-14 py-12">
        <div role="note" className="flex gap-3 rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm leading-relaxed text-ink">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warn" />
          <p>
            <strong className="font-semibold text-heading">Read this first. </strong>
            {d.limits}
          </p>
        </div>

        <section id="relationships" aria-labelledby={`${uid}-order`} className="scroll-mt-28">
          <h2 id={`${uid}-order`} className="text-2xl font-bold">
            What to prepare first
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Each row draws on the documents in the rows above it, so details flow downwards. Where a document names alternatives (for example a bill of lading or an air waybill), you need the one that matches your mode of transport.
          </p>
          <ol className="mt-6 space-y-4">
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl) => {
              const inLevel = d.documents.filter((x) => levels.get(x.id) === lvl);
              if (inLevel.length === 0) return null;
              return (
                <li key={lvl} className="flex gap-4">
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-link bg-page font-display text-sm font-bold text-link">
                    {lvl}
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl border border-line bg-surface p-4">
                    <h3 className="text-sm font-semibold text-heading">{lvl === 1 ? 'Start here — drawn from the sales contract, not from another document' : `Built from level ${lvl - 1} and earlier`}</h3>
                    <ul className="mt-3 flex flex-wrap gap-2">{inLevel.map((x) => chip(x.id))}</ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby={`${uid}-docs`}>
          <h2 id={`${uid}-docs`} className="text-2xl font-bold">
            The documents
          </h2>
          <div role="group" aria-label="Filter documents by type" className="mt-5 inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
            {[{ id: 'all', title: 'All' }, ...d.categories].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={cn('min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors', category === c.id ? 'bg-ocean text-white shadow' : 'text-ink hover:bg-soft')}
              >
                {c.title}
              </button>
            ))}
          </div>
          <p role="status" className="tabular mt-3 text-xs text-muted">
            {shown.length} of {d.documents.length} documents shown
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {shown.map((x, i) => (
              <Reveal key={x.id} delay={(i % 2) * 70}>
                <article id={`doc-${x.id}`} className="scroll-mt-28 rounded-2xl border border-line bg-surface p-5">
                  <h3 className="text-xl font-bold">{x.name}</h3>
                  <div className="mt-2">
                    <Badge tone="info">{catTitle.get(x.category)}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink">{x.summary}</p>
                  <dl className="mt-4 space-y-2 text-sm leading-relaxed">
                    <div>
                      <dt className="inline font-semibold text-heading">What it is for: </dt>
                      <dd className="inline text-ink">{x.purpose}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-heading">Prepared by: </dt>
                      <dd className="inline text-ink">{x.preparedBy}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-heading">Issued by: </dt>
                      <dd className="inline text-ink">{x.issuedBy}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-heading">When it is needed: </dt>
                      <dd className="inline text-ink">{x.whenNeeded}</dd>
                    </div>
                  </dl>
                  {x.dependsOn.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">Draws on</h4>
                      <ul className="mt-2 flex flex-wrap gap-2">{x.dependsOn.map(chip)}</ul>
                    </div>
                  )}
                  {(usedBy.get(x.id)?.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">Feeds into</h4>
                      <ul className="mt-2 flex flex-wrap gap-2">{usedBy.get(x.id)!.map(chip)}</ul>
                    </div>
                  )}
                  <p className="mt-4 rounded-lg bg-soft p-3 text-sm leading-relaxed text-ink">
                    <span className="font-semibold text-heading">Watch out: </span>
                    {x.watchOut}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-line pt-8">
          <Link to="/academy/incoterms" className={buttonClass('primary', 'md')}>
            Incoterms® 2020 rules
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
          <Link to="/academy/glossary" className={buttonClass('secondary', 'md')}>
            Trade glossary
          </Link>
        </div>
      </div>
    </>
  );
}
