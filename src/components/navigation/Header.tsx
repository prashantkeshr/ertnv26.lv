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
import { Link, useLocation } from 'react-router';
import { DIVISIONS, type Division } from '@/app/modules';
import { cn } from '@/components/common/primitives';
import { ModuleStatusBadge } from '@/components/common/StatusBadge';
import { Dialog } from '@/components/feedback/Dialog';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { CountriesPanel, ResourcesPanel } from './MegaMenus';
import { ThemeToggle } from './ThemeToggle';
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
        <p className="text-xs font-semibold tracking-[0.14em] text-link uppercase">{division.kicker}</p>
        <p className="mt-2 font-display text-lg font-bold text-heading">{division.purpose}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{division.description}</p>
        <Link to={division.path} onClick={onNavigate} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:text-link-hover">
          {t('nav.overview', { division: division.title })}
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
      <ul className="grid content-start gap-x-6 gap-y-1 sm:grid-cols-2">
        {division.modules.map((m) => {
          const body = (
            <>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn('text-sm font-semibold', m.path ? 'text-heading group-hover:text-link' : 'text-ink')}>{m.title}</span>
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
  const barRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const openDivision = DIVISIONS.find((d) => d.id === openId);

  // Glass header + reading-progress bar. The bar is updated directly (no re-render per scroll event).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [location.pathname]);

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
      <div className={cn('relative text-white transition-[background-color,box-shadow] duration-300', scrolled ? 'bg-deep/90 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.8)] backdrop-blur-md' : 'bg-navy')}>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
          <div ref={barRef} className="scroll-progress h-full bg-aurora" style={{ transform: 'scaleX(0)' }} />
        </div>
        <div className="container-page flex h-16 items-center gap-2 lg:gap-6">
          <Link to="/" aria-label="eport home" className="shrink-0 rounded">
            <Logo />
          </Link>

          <nav aria-label={t('nav.primary')} className="hidden min-w-0 xl:block">
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
                      onPointerEnter={(e) => e.pointerType === 'mouse' && openId !== null && setOpenId(d.id)}
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
              {[
                { id: 'countries', label: t('nav.countries'), current: location.pathname.startsWith('/countries') },
                { id: 'resources', label: 'Resources', current: location.pathname.startsWith('/intelligence/news') || location.pathname.startsWith('/academy/videos') },
              ].map((item) => {
                const expanded = openId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-division={item.id}
                      aria-expanded={expanded}
                      aria-controls="division-panel"
                      onClick={() => setOpenId(expanded ? null : item.id)}
                      onPointerEnter={(e) => e.pointerType === 'mouse' && openId !== null && setOpenId(item.id)}
                      className={cn(
                        'flex h-16 items-center gap-1 border-b-2 px-2.5 text-sm font-medium whitespace-nowrap transition-colors xl:px-3',
                        expanded || item.current ? 'border-sky text-white' : 'border-transparent text-white/80 hover:text-white',
                      )}
                    >
                      {item.label}
                      <ChevronDown aria-hidden="true" className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-1">
            {/* Inline search where there is room: tablets (no nav bar) and wide desktops. */}
            <div className="hidden w-64 md:block xl:hidden 2xl:block">
              <SearchCombobox variant="header" inputId="header-search" />
            </div>
            <ThemeToggle />
            <Link to="/contact" className="ms-1 hidden min-h-9 items-center rounded-md border border-white/25 px-3.5 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-navy 2xl:inline-flex">
              Contact
            </Link>
            <Link to="/search" aria-label={t('search.label')} className="rounded-md p-2.5 text-white/85 hover:bg-white/10 hover:text-white md:hidden xl:block 2xl:hidden">
              <Search aria-hidden="true" className="size-5" />
            </Link>
            <button
              type="button"
              aria-label={t('nav.openMenu')}
              aria-haspopup="dialog"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2.5 text-white/85 hover:bg-white/10 hover:text-white xl:hidden"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        <div id="division-panel" className={cn('absolute inset-x-0 top-full max-h-[calc(100dvh-6rem)] overflow-y-auto border-b border-line bg-soft text-ink shadow-menu', openId ? 'hidden xl:block' : 'hidden')}>
          {openDivision && (
            <div className="bg-surface">
              <DivisionPanel division={openDivision} onNavigate={() => setOpenId(null)} />
            </div>
          )}
          {openId === 'countries' && <CountriesPanel onNavigate={() => setOpenId(null)} />}
          {openId === 'resources' && <ResourcesPanel onNavigate={() => setOpenId(null)} />}
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
                    <Icon aria-hidden="true" className="size-5 shrink-0 text-link" />
                    <span>
                      <span className="block text-sm font-semibold text-heading">{d.title}</span>
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
              { to: '/intelligence/news', label: 'Trade and maritime news' },
              { to: '/academy/videos', label: 'Official explainer videos' },
              { to: '/countries/IN#guide', label: 'India: export and import guide' },
              { to: '/data-reliability', label: 'Data Reliability Centre' },
              { to: '/contact', label: 'Contact us' },
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
