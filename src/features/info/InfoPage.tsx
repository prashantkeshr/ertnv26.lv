import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { routeMeta } from '@/app/route-meta';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { COMPANY } from '@/app/company';
import { OwnershipNote } from '@/components/common/OwnershipNote';
import { RequirementBadge, VerificationBadge } from '@/components/common/StatusBadge';
import { useSeo } from '@/hooks/useSeo';
import type { RequirementStatus, VerificationStatus } from '@/types/schemas';

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-12 mb-3 text-xl font-bold first:mt-0">{children}</h2>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-base leading-relaxed text-ink">{children}</p>;
}
function Ul({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mb-4 list-disc space-y-2 ps-5 text-base leading-relaxed text-ink marker:text-muted">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const VERIFICATION_TEXT: Record<VerificationStatus, string> = {
  'officially-verified': 'An eport editor has compared the content with the official source. Used sparingly, and never on the strength of a working link alone.',
  'source-referenced': 'The record cites an official source and the link has been confirmed reachable. The wording is eport’s own summary.',
  'needs-review': 'Something could not be confirmed — for example, the official website did not respond to a check. Treat with extra care.',
  outdated: 'The source has changed or the record has passed its review date. Shown so that nobody relies on it by mistake.',
};
const REQUIREMENT_TEXT: Record<RequirementStatus, string> = {
  mandatory: 'Required by the cited source for the stated product, direction and jurisdiction.',
  conditional: 'Required only when stated conditions are met — for example a particular product, value or destination.',
  optional: 'Not required by the cited source, but commonly used or commercially useful.',
  unknown: 'eport has no reliable record either way. This never means “not required” — confirm with the authority.',
};

function About() {
  return (
    <>
      <H2>What eport is</H2>
      <P>
        eport is an independent information platform for international trade and maritime commerce. It brings together country profiles, official authorities, international
        organizations, sourced statistics and — as they are built — learning pathways, document guidance and planning tools for exporters and importers.
      </P>
      <H2>Who runs eport</H2>
      <OwnershipNote />
      <P>
        Dhurta Group manages the platform day to day. eport remains independent of any government or regulator: ownership by Dhurta.org does not change how sources are chosen, how records
        are labelled, or what the site will and will not claim. Questions, corrections and partnership enquiries go to{' '}
        <a href={`mailto:${COMPANY.supportEmail}`} className="link">
          {COMPANY.supportEmail}
        </a>{' '}
        or the <Link to="/contact" className="link">contact page</Link>.
      </P>
      <H2>What eport is not</H2>
      <Ul
        items={[
          'It is not a government, customs administration, port authority, embassy, regulator or international organization, and it is not affiliated with or endorsed by any of them.',
          'It does not issue licences, certificates, clearances or approvals of any kind.',
          'It does not give legal, customs, tax or financial advice. Its guidance is preliminary and general.',
          'It does not operate accounts, messaging, payments or a marketplace. The site is a static website with no server behind it.',
        ]}
      />
      <H2>How it is built</H2>
      <P>
        Everything runs in your browser. Data is published as validated static files; a small number of public data services that explicitly allow browser use are called directly. There
        are no secret keys in the site, and features that would need one are marked Coming Soon rather than imitated.
      </P>
      <P>
        The platform is being built in tested stages. The <Link to="/data-reliability" className="link">Data Reliability Centre</Link> shows what is available now, and{' '}
        <Link to="/methodology" className="link">Sources and methodology</Link> explains how content is sourced and labelled.
      </P>
    </>
  );
}

function Methodology() {
  return (
    <>
      <H2>Accuracy before completeness</H2>
      <P>eport would rather show a gap than a guess. If something is not sourced it is not published, and where coverage is partial the page says so.</P>

      <H2>Source priority</H2>
      <P>When sources differ, the higher one prevails:</P>
      <ol className="mb-4 list-decimal space-y-2 ps-5 text-base leading-relaxed text-ink marker:text-muted">
        <li>Official government authority</li>
        <li>Official international organization</li>
        <li>Official port, carrier or regulator</li>
        <li>Recognized statutory organization</li>
        <li>Licensed authoritative data provider</li>
        <li>Reputable research organization</li>
        <li>Secondary publications — for context only, never as the basis of a requirement</li>
      </ol>

      <H2>Verification status</H2>
      <P>Every authority and organization record carries one of four labels:</P>
      <dl className="mb-4 divide-y divide-line border-y border-line">
        {(Object.keys(VERIFICATION_TEXT) as VerificationStatus[]).map((s) => (
          <div key={s} className="grid gap-2 py-4 sm:grid-cols-[15rem_1fr]">
            <dt>
              <VerificationBadge status={s} />
            </dt>
            <dd className="text-sm leading-relaxed text-ink">{VERIFICATION_TEXT[s]}</dd>
          </div>
        ))}
      </dl>

      <H2>Requirement status</H2>
      <P>Trade requirements, as they are published, are classified as:</P>
      <dl className="mb-4 divide-y divide-line border-y border-line">
        {(Object.keys(REQUIREMENT_TEXT) as RequirementStatus[]).map((s) => (
          <div key={s} className="grid gap-2 py-4 sm:grid-cols-[15rem_1fr]">
            <dt>
              <RequirementBadge status={s} />
            </dt>
            <dd className="text-sm leading-relaxed text-ink">{REQUIREMENT_TEXT[s]}</dd>
          </div>
        ))}
      </dl>

      <H2>Statistics</H2>
      <Ul
        items={[
          'Every figure shows its source, observation year, unit and the date the source was last updated.',
          'Historical statistics, estimates, forecasts and live data are labelled as such and never mixed.',
          'Missing observations stay missing. eport does not interpolate, estimate or carry values forward.',
        ]}
      />

      <H2>Connected records</H2>
      <P>
        Records are linked into a knowledge graph: an authority to its jurisdiction and parent body, a national body to its international counterpart, an organization to its
        headquarters country. Each link is declared on a sourced record, so the “Connected records” panel on a page only ever shows relationships eport can point to. Documents, ports, HS
        codes and trade agreements join the graph as they are published.
      </P>

      <H2>Editorial review</H2>
      <Ul
        items={[
          'New regulatory content is drafted against the official source and recorded with publisher, URL, jurisdiction, applicable products and direction, effective date and check date.',
          'Automated checks validate every data file against its schema, reject duplicate identifiers and broken references, and test official links.',
          'A record whose official link stops responding is flagged “Needs review” automatically.',
          'Only an editorial comparison with the source can mark a record “Reviewed against official source”.',
        ]}
      />

      <H2>Official content and eport’s own words</H2>
      <P>
        Summaries on eport are written by eport and labelled as editorial. They are not text from the authority or organization described. Official forms are never reproduced; eport
        links to the issuing authority’s own portal.
      </P>
      <P>
        See the live picture in the <Link to="/data-reliability" className="link">Data Reliability Centre</Link>.
      </P>
    </>
  );
}

function Privacy() {
  return (
    <>
      <H2>No accounts, no server</H2>
      <P>eport is a static website. There is no sign-in, no user database and no eport server that receives what you type. eport does not use advertising or analytics trackers.</P>

      <H2>What is stored in your browser</H2>
      <Ul
        items={[
          <>
            <strong className="font-semibold text-heading">Recent searches</strong> — your last six searches, so they can be offered again. Clear them from the search box.
          </>,
          <>
            <strong className="font-semibold text-heading">Language preference</strong> — once more than one language is available.
          </>,
          <>
            <strong className="font-semibold text-heading">Colour theme</strong> — Automatic (follows your device), Light or Dark.
          </>,
          <>
            <strong className="font-semibold text-heading">Live web results setting</strong> — whether search should include live results from Wikipedia and GDELT (on by default).
          </>,
          <>
            <strong className="font-semibold text-heading">Cached exchange rates and live search results</strong> — so the same request is not repeated within a few minutes.
          </>,
        ]}
      />
      <P>
        This information stays on this device, in this browser. It is not synchronised, it is not available on your other devices, and clearing your browser’s site data removes it. When
        the Trade Desk tools arrive, projects and drafts will be stored the same way, with a backup file you can download and restore.
      </P>

      <H2>Requests to other services</H2>
      <P>Your browser contacts a third party only in these cases:</P>
      <Ul
        items={[
          <>
            <strong className="font-semibold text-heading">Frankfurter (exchange rates)</strong> — when you open a country profile, your browser asks for one reference rate. The request contains
            two currency codes and, as with any web request, your IP address reaches that service.
          </>,
          <>
            <strong className="font-semibold text-heading">Nager.Date (public holidays)</strong> — when you open a country profile, your browser asks for that country’s public holidays. The request contains the
            two-letter country code and the year.
          </>,
          <>
            <strong className="font-semibold text-heading">YouTube (videos)</strong> — only when you press play on a video. Until then nothing is requested from YouTube. Videos load in YouTube’s
            privacy-enhanced mode (youtube-nocookie.com), but YouTube can still see your IP address and may set its own technical data once the video loads.
          </>,
          <>
            <strong className="font-semibold text-heading">Wikipedia (live web results)</strong> — when you run a search with live web results on, your browser sends your search words to Wikipedia to fetch matching
            articles. This is on by default and can be switched off on the search page.
          </>,
          <>
            <strong className="font-semibold text-heading">GDELT Project (live news headlines)</strong> — in the same situation, and on the News page when you search live headlines, your browser sends your search
            words to the GDELT news service.
          </>,
          <>
            <strong className="font-semibold text-heading">Official websites</strong> — only when you choose to follow a link. Links open in a new tab without passing a referrer.
          </>,
        ]}
      />
      <P>
        As with any web request, the IP address of your connection reaches Wikipedia, GDELT and Frankfurter when they are contacted. Web results are not checked by eport. Fonts, flags, map geometry, official
        news headlines and all eport data are served from eport.live itself; World Bank statistics and publisher news feeds are collected by eport in advance and are not requested by your browser.
      </P>

      <H2>Contacting us</H2>
      <P>
        The contact form on this site does not send anything itself. It prepares an email and opens <em>your</em> email application, addressed to {COMPANY.supportEmail}. Nothing is transmitted
        until you press send in that application, and eport keeps no copy of what you wrote.
      </P>

      <H2>Hosting</H2>
      <P>The site is hosted on GitHub Pages. Like any web host, GitHub may log technical request data such as IP addresses under its own privacy statement.</P>
    </>
  );
}

const PAGES = {
  about: { path: '/about', crumb: 'About', title: 'About eport', lead: 'An independent platform for international trade and maritime information.', Body: About },
  methodology: { path: '/methodology', crumb: 'Sources and methodology', title: 'Sources and methodology', lead: 'How eport chooses sources, labels what it publishes and reviews regulatory content.', Body: Methodology },
  privacy: { path: '/privacy', crumb: 'Privacy', title: 'Privacy and local data', lead: 'What stays in your browser, and the few requests that leave it.', Body: Privacy },
} as const;

export default function InfoPage({ page }: { page: keyof typeof PAGES }) {
  const { path, crumb, title, lead, Body } = PAGES[page];
  const meta = routeMeta(path);
  const crumbs = [{ label: crumb }];
  useSeo({ title: meta.title, description: meta.description, path, breadcrumbs: seoCrumbs(crumbs, path) });
  return (
    <>
      <PageHeader crumbs={crumbs} title={title} description={lead} />
      <article className="container-page py-12">
        <div className="max-w-3xl">
          <Body />
        </div>
      </article>
    </>
  );
}
