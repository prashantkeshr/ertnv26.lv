import { ArrowUpRight, AtSign } from 'lucide-react';
import { Link } from 'react-router';
import { COMPANY } from '@/app/company';
import { DIVISIONS } from '@/app/modules';
import { SITE } from '@/app/route-meta';
import { ExternalLink } from '@/components/common/primitives';
import { useI18n } from '@/i18n';
import { Logo } from './Header';

const EXPLORE = [
  { to: '/countries', label: 'Country Explorer' },
  { to: '/trade', label: 'Trade Explorer' },
  { to: '/regions/asia', label: 'Trade in Asia' },
  { to: '/regions/europe', label: 'Trade in Europe' },
  { to: '/regions/africa', label: 'Trade in Africa' },
  { to: '/regions/americas', label: 'Trade in the Americas' },
  { to: '/regions/oceania', label: 'Trade in Oceania' },
  { to: '/academy/incoterms', label: 'Incoterms® explained' },
  { to: '/academy/documents', label: 'Trade documents' },
  { to: '/academy/glossary', label: 'Trade glossary' },
  { to: '/directory/organizations', label: 'International organizations' },
  { to: '/directory/authorities', label: 'Official authorities' },
  { to: '/intelligence/news', label: 'Trade news' },
  { to: '/search', label: 'Search' },
];
const TRUST = [
  { to: '/data-reliability', label: 'Data Reliability Centre' },
  { to: '/methodology', label: 'Sources and methodology' },
  { to: '/about', label: 'About eport' },
  { to: '/contact', label: 'Contact' },
  { to: '/privacy', label: 'Privacy and local data' },
];

function Column({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-semibold tracking-[0.14em] text-sky uppercase">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-white/80 transition-colors hover:text-white hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="hero-bg relative text-white">
      <div className="container-page grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 text-sm font-medium text-white/90">{SITE.positioning}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">{SITE.tagline}</p>
          <a href={`mailto:${COMPANY.supportEmail}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sky hover:underline">
            <AtSign aria-hidden="true" className="size-4" />
            {COMPANY.supportEmail}
          </a>
        </div>
        <Column title={t('footer.platform')} links={DIVISIONS.map((d) => ({ to: d.path, label: d.kicker }))} />
        <Column title={t('footer.explore')} links={EXPLORE} />
        <Column title={t('footer.trust')} links={TRUST} />
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-6 text-xs leading-relaxed text-white/70 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2.5">
            <p className="text-sm font-medium text-white">
              A subsidiary of{' '}
              <ExternalLink href={COMPANY.parent.url} className="!text-sky">
                {COMPANY.parent.name}
              </ExternalLink>
              <span className="text-white/60"> · Managed by {COMPANY.manager}</span>
            </p>
            <p>{t('footer.rights')}</p>
            <p>
              Country reference data © mledoze/countries contributors (ODbL 1.0). Map geometry: Natural Earth (public domain). Trade and economic indicators: World Bank, World Development
              Indicators (CC BY 4.0). Exchange rates via Frankfurter.
            </p>
            <p>
              © {new Date().getFullYear()} eport · eport.live · Operated by {COMPANY.manager}
            </p>
          </div>
          <a href="#main" className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-white/20 px-3 py-2 text-white/85 transition-colors hover:border-white/50 hover:text-white">
            Back to top
            <ArrowUpRight aria-hidden="true" className="size-3.5 -rotate-45" />
          </a>
        </div>
      </div>
    </footer>
  );
}
