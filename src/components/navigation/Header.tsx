import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Globe,
  GraduationCap,
  Handshake,
  Landmark,
  Layers,
  Menu,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { DIVISIONS, type Division } from '@/app/modules';
import { cn } from '@/components/common/primitives';
import { ModuleStatusBadge } from '@/components/common/StatusBadge';
import { Dialog } from '@/components/feedback/Dialog';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { useI18n } from '@/i18n';

export const DIVISION_ICON: Record<Division['icon'], LucideIcon> = {
  globe: Globe,
  graduation: GraduationCap,
  handshake: Handshake,
  briefcase: BriefcaseBusiness,
  landmark: Landmark,
  calendar: CalendarDays,
  layers: Layers,
};

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="16" cy="16" r="12.5" className="text-sky" stroke="currentColor" />
        <path d="M3.5 16h25M16 3.5c-4.4 3.4-6.6 7.6-6.6 12.5s2.2 9.1 6.6 12.5M16 3.5c4.4 3.4 6.6 7.6 6.6 12.5S20.4 25.1 16 28.5" className="text-sky/70" stroke="currentColor" />
      </svg>
      <span className="font-display text-[1.375rem] leading-none font-extrabold tracking-tight">eport</span>
    </span>
  );
}

function DivisionPanel({ division, onNavigate }: { division: Division; onNavigate: () => void }) {
  const { t } = useI18n();
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[18rem_1fr]">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-ocean uppercase">{division.kicker}</p>
        <p className="mt-2 font-display text-lg font-bold text-navy">{division.purpose}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{division.description}</p>
        <Link to={division.path} onClick={onNavigate} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-dark">
          {t('nav.overview', { division: division.title })}
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
      <ul className="grid content-start gap-x-6 gap-y-1 sm:grid-cols-2">
        {division.modules.map((m) => {
          const body = (
            <>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn('text-sm font-semibold', m.path ? 'text-navy group-hover:text-ocean' : 'text-ink')}>{m.title}</span>
                <ModuleStatusBadge status={m.status} />
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{m.summary}</span>
            </>
          );
          return (
            <li key={m.id}>
              {m.path ? (
                <Link to={m.path} onClick={onNavigate} className="group block rounded-md px-3 py-2.5 hover:bg-soft">
                  {body}
                </Link>
              ) : (
                <div className="px-3 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  const location = useLocation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const openDivision = DIVISIONS.find((d) => d.id === openId);

  // Close menus on navigation.
  useEffect(() => {
    setOpenId(null);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpenId(null);
      headerRef.current?.querySelector<HTMLElement>(`[data-division="${openId}"]`)?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [openId]);

  // "/" focuses search unless the user is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const input = document.getElementById('header-search') ?? document.getElementById('hero-search');
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-30">
      <div className="bg-midnight text-white/85">
        <div className="container-page flex min-h-8 items-center justify-between gap-4 py-1.5 text-xs">
          <p>{t('brand.independent')}</p>
          <Link to="/data-reliability" className="hidden shrink-0 font-medium text-sky hover:underline sm:block">
            Data Reliability Centre
          </Link>
        </div>
      </div>

      <div className="relative bg-navy text-white">
        <div className="container-page flex h-16 items-center gap-2 lg:gap-6">
          <Link to="/" aria-label="eport home" className="shrink-0 rounded">
            <Logo />
          </Link>

          <nav aria-label={t('nav.primary')} className="hidden min-w-0 lg:block">
            <ul className="flex items-center">
              {DIVISIONS.map((d) => {
                const expanded = openId === d.id;
                const current = location.pathname.startsWith(d.path);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      data-division={d.id}
                      aria-expanded={expanded}
                      aria-controls="division-panel"
                      onClick={() => setOpenId(expanded ? null : d.id)}
                      className={cn(
                        'flex h-16 items-center gap-1 border-b-2 px-2.5 text-sm font-medium whitespace-nowrap transition-colors xl:px-3',
                        expanded || current ? 'border-sky text-white' : 'border-transparent text-white/80 hover:text-white',
                      )}
                    >
                      {d.title}
                      <ChevronDown aria-hidden="true" className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
                    </button>
                  </li>
                );
              })}
              <li>
                <NavLink
                  to="/countries"
                  className={({ isActive }) =>
                    cn(
                      'flex h-16 items-center border-b-2 px-2.5 text-sm font-medium transition-colors xl:px-3',
                      isActive ? 'border-sky text-white' : 'border-transparent text-white/80 hover:text-white',
                    )
                  }
                >
                  {t('nav.countries')}
                </NavLink>
              </li>
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-1">
            {/* Inline search where there is room: tablets (no nav bar) and wide desktops. */}
            <div className="hidden w-64 md:block lg:hidden xl:block">
              <SearchCombobox variant="header" inputId="header-search" />
            </div>
            <Link to="/search" aria-label={t('search.label')} className="rounded-md p-2.5 text-white/85 hover:bg-white/10 hover:text-white md:hidden lg:block xl:hidden">
              <Search aria-hidden="true" className="size-5" />
            </Link>
            <button
              type="button"
              aria-label={t('nav.openMenu')}
              aria-haspopup="dialog"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2.5 text-white/85 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        <div id="division-panel" className={cn('absolute inset-x-0 top-full max-h-[calc(100dvh-6rem)] overflow-y-auto border-b border-line bg-white text-ink shadow-menu', openDivision ? 'hidden lg:block' : 'hidden')}>
          {openDivision && <DivisionPanel division={openDivision} onNavigate={() => setOpenId(null)} />}
        </div>
      </div>

      <Dialog open={mobileOpen} onClose={() => setMobileOpen(false)} title={t('nav.menuTitle')} closeLabel={t('nav.closeMenu')} variant="sheet">
        <nav aria-label={t('nav.primary')} className="px-3 py-3">
          <ul>
            {DIVISIONS.map((d) => {
              const Icon = DIVISION_ICON[d.icon];
              return (
                <li key={d.id}>
                  <Link to={d.path} className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-soft">
                    <Icon aria-hidden="true" className="size-5 shrink-0 text-ocean" />
                    <span>
                      <span className="block text-sm font-semibold text-navy">{d.title}</span>
                      <span className="block text-xs text-muted">{d.purpose}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className="mt-3 border-t border-line pt-3">
            {[
              { to: '/countries', label: 'Country Explorer' },
              { to: '/directory/organizations', label: 'International organizations' },
              { to: '/directory/authorities', label: 'Official authorities' },
              { to: '/data-reliability', label: 'Data Reliability Centre' },
              { to: '/methodology', label: 'Sources and methodology' },
              { to: '/about', label: 'About eport' },
            ].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="block rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-soft">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Dialog>
    </header>
  );
}
