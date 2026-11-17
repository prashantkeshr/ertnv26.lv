import { Compass, FileSearch, SearchCheck } from 'lucide-react';
import { Link } from 'react-router';
import { COMPANY } from '@/app/company';
import { Accordion, type AccordionItem } from '@/components/common/Accordion';
import { Reveal } from '@/components/common/motion';
import { ButtonLink, Kicker, Section } from '@/components/common/primitives';

const STEPS = [
  { icon: SearchCheck, title: 'Search or pick a market', text: 'Type a country, authority, code or topic — or choose a market on the map. Results come from eport’s published records, with live web context alongside.' },
  { icon: FileSearch, title: 'Check the source and status', text: 'Every record shows who published the information, when it was checked and whether it is source-referenced, reviewed, in need of review or outdated.' },
  { icon: Compass, title: 'Go to the official authority', text: 'eport points you to the authority’s own website to confirm requirements for your product and route — it never replaces them.' },
];

export function HowItWorks() {
  return (
    <Section tone="soft" aria-labelledby="how-heading">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Kicker>How it works</Kicker>
        <h2 id="how-heading" className="text-3xl font-bold sm:text-4xl">
          From question to official source in three steps
        </h2>
      </Reveal>
      <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
        <div aria-hidden="true" className="absolute start-[16%] end-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-line to-transparent md:block" />
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Reveal delay={i * 110} className="h-full">
              <div className="relative h-full rounded-2xl border border-line bg-surface p-6 text-center">
                <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-ocean to-navy text-white shadow-[0_14px_30px_-12px_rgb(23_107_154/0.8)]">
                  <s.icon aria-hidden="true" className="size-7" strokeWidth={1.6} />
                  <span className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full bg-aurora text-xs font-extrabold text-navy" aria-hidden="true">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-5 text-lg font-bold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const FAQS: AccordionItem[] = [
  {
    id: 'official',
    question: 'Is eport a government or official body?',
    answer: (
      <p>
        No. eport is an independent information platform — a subsidiary of Dhurta.org, managed by {COMPANY.manager}. It is not a government, customs, port or regulatory service and issues no licences,
        certificates or clearances. Every record links to the official source so you can confirm requirements with the authority itself.
      </p>
    ),
  },
  {
    id: 'current',
    question: 'How current is the information?',
    answer: (
      <p>
        Each dataset shows its date. Trade statistics are annual and historical; news headlines are refreshed daily; reference exchange rates update on working days; live web results are fetched when you
        search. The <Link to="/data-reliability" className="link">Data Reliability Centre</Link> lists every dataset with its coverage and last update.
      </p>
    ),
  },
  {
    id: 'status',
    question: 'What does “source referenced” mean?',
    answer: (
      <p>
        The record cites an official source and that link was confirmed reachable. It does not mean the organization has reviewed eport’s summary. “Reviewed against official source” is used only after an editor
        compares the content with the source. See <Link to="/methodology" className="link">Sources and methodology</Link>.
      </p>
    ),
  },
  {
    id: 'documents',
    question: 'Can eport tell me exactly which documents my shipment needs?',
    answer: (
      <p>
        Not yet. The document library and the Smart Trade Navigator are in development and will give preliminary, source-linked guidance — never an official clearance. Until then, use the Quick Finder to reach the
        right authority and confirm with it directly. Requirements depend on the product, its use, origin and destination.
      </p>
    ),
  },
  {
    id: 'web',
    question: 'Where do the live web results in search come from?',
    answer: (
      <p>
        From Wikipedia (encyclopedia articles) and the GDELT Project (news headlines), requested directly by your browser when you search. Your search words are sent to them, results are unverified, and you can turn
        them off on the search page. eport’s own records are always shown first and labelled separately.
      </p>
    ),
  },
  {
    id: 'privacy',
    question: 'Does eport store my data or need an account?',
    answer: (
      <p>
        There are no accounts and no eport server. Preferences such as recent searches and your colour theme stay in your browser. The contact form opens your own email app rather than sending anything itself. Details on the{' '}
        <Link to="/privacy" className="link">privacy page</Link>.
      </p>
    ),
  },
  {
    id: 'report',
    question: 'How do I report an error or suggest a source?',
    answer: (
      <p>
        Write to{' '}
        <a href={`mailto:${COMPANY.supportEmail}`} className="link">
          {COMPANY.supportEmail}
        </a>{' '}
        or use the <Link to="/contact" className="link">contact page</Link>. Include the page address and, if you can, the official source — corrections are how accuracy improves.
      </p>
    ),
  },
];

export function Faq() {
  return (
    <Section aria-labelledby="faq-heading">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <Reveal>
          <Kicker>Questions</Kicker>
          <h2 id="faq-heading" className="text-3xl font-bold sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">Straight answers about what eport is, what it covers and what it does not.</p>
          <ButtonLink to="/contact" variant="secondary" className="mt-6">
            Ask us something else
          </ButtonLink>
        </Reveal>
        <Reveal delay={100}>
          <Accordion items={FAQS} />
        </Reveal>
      </div>
    </Section>
  );
}
