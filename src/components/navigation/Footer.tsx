import { Link } from 'react-router';
import { DIVISIONS } from '@/app/modules';
import { SITE } from '@/app/route-meta';
import { useI18n } from '@/i18n';
import { Logo } from './Header';

const EXPLORE = [
  { to: '/countries', label: 'Country Explorer' },
  { to: '/directory/organizations', label: 'International organizations' },
  { to: '/directory/authorities', label: 'Official authorities' },
  { to: '/search', label: 'Search' },
];
const TRUST = [
  { to: '/data-reliability', label: 'Data Reliability Centre' },
  { to: '/methodology', label: 'Sources and methodology' },
  { to: '/about', label: 'About eport' },
  { to: '/privacy', label: 'Privacy and local data' },
];

function Column({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-semibold tracking-[0.14em] text-sky uppercase">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-white/80 hover:text-white hover:underline">
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
    <footer className="bg-navy text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 text-sm font-medium text-white/90">{SITE.positioning}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">{SITE.tagline}</p>
        </div>
        <Column title={t('footer.platform')} links={DIVISIONS.map((d) => ({ to: d.path, label: d.kicker }))} />
        <Column title={t('footer.explore')} links={EXPLORE} />
        <Column title={t('footer.trust')} links={TRUST} />
      </div>
      <div className="border-t border-white/10">
        <div className="container-page space-y-3 py-6 text-xs leading-relaxed text-white/65">
          <p className="max-w-4xl">{t('footer.rights')}</p>
          <p className="max-w-4xl">
            Country reference data © mledoze/countries contributors (ODbL 1.0). Map geometry: Natural Earth (public domain). Trade and economic
            indicators: World Bank, World Development Indicators (CC BY 4.0). Exchange rates via Frankfurter.
          </p>
          <p>© {new Date().getFullYear()} eport · eport.live</p>
        </div>
      </div>
    </footer>
  );
}
