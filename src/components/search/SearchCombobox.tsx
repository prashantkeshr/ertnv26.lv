/**
 * Global search box (WAI-ARIA combobox with a listbox popup).
 *
 * - The search index is fetched on first focus, never on page load.
 * - Empty query → recent searches. Typing → ranked suggestions with highlighted matches.
 * - Enter on a suggestion opens it; Enter otherwise goes to the full results page.
 */
import { ArrowRight, History, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { cn } from '@/components/common/primitives';
import { useToast } from '@/components/feedback/Toast';
import { useI18n } from '@/i18n';
import { highlightParts, loadSearchEngine, type SearchEngine, type SearchResult } from '@/services/search/engine';
import { recentSearches } from '@/services/storage/preferences';
import { ENTITY_LABELS } from '@/utils/entities';

type Option =
  | { kind: 'result'; id: string; result: SearchResult }
  | { kind: 'recent'; id: string; query: string }
  | { kind: 'all'; id: string };

interface Props {
  variant?: 'hero' | 'header';
  initialQuery?: string;
  inputId?: string;
}

export function Highlight({ text, query, terms }: { text: string; query: string; terms?: string[] }) {
  return (
    <>
      {highlightParts(text, query, terms).map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
    </>
  );
}

export function SearchCombobox({ variant = 'hero', initialQuery = '', inputId }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useToast();
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLFormElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const [engineState, setEngineState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  // Close when the route changes (a suggestion was opened).
  useEffect(() => {
    setOpen(false);
    setActive(-1);
  }, [location.pathname, location.search]);

  const countryContext = /^\/countries\/([A-Za-z]{2})\b/.exec(location.pathname)?.[1]?.toUpperCase() ?? null;

  function ensureEngine() {
    if (engineState === 'ready' || engineState === 'loading') return;
    setEngineState('loading');
    loadSearchEngine().then(
      (e) => {
        setEngine(e);
        setEngineState('ready');
      },
      () => setEngineState('error'),
    );
  }

  const trimmed = query.trim();
  const options = useMemo<Option[]>(() => {
    if (!trimmed) return recents.map((q, i) => ({ kind: 'recent', id: `${uid}-r${i}`, query: q }));
    if (!engine) return [];
    const results = engine.search(trimmed, { limit: 6, countryContext });
    return [
      ...results.map((result, i): Option => ({ kind: 'result', id: `${uid}-o${i}`, result })),
      { kind: 'all', id: `${uid}-all` },
    ];
  }, [trimmed, engine, recents, countryContext, uid]);

  function goToResults(q: string) {
    const value = q.trim();
    if (!value) return;
    recentSearches.add(value);
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(value)}`);
  }

  function choose(option: Option) {
    if (option.kind === 'result') {
      recentSearches.add(trimmed);
      setOpen(false);
      inputRef.current?.blur();
      navigate(option.result.path);
    } else if (option.kind === 'recent') {
      setQuery(option.query);
      goToResults(option.query);
    } else {
      goToResults(trimmed);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const option = active >= 0 ? options[active] : undefined;
    if (option) choose(option);
    else goToResults(query);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      if (!options.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + options.length + (i < 0 && step < 0 ? 1 : 0)) % options.length);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  }

  const hero = variant === 'hero';
  const showPopup = open && (options.length > 0 || trimmed.length > 0);
  const hasOptions = showPopup && options.length > 0;
  const activeId = active >= 0 ? options[active]?.id : undefined;

  return (
    <form
      ref={rootRef}
      role="search"
      aria-label={t('search.label')}
      onSubmit={onSubmit}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      className="relative w-full"
    >
      <div
        className={cn(
          'flex items-center bg-surface',
          hero ? 'rounded-lg p-1.5 shadow-menu ring-1 ring-white/20' : 'rounded-md border border-line focus-within:border-ocean',
        )}
      >
        <Search aria-hidden="true" className={cn('shrink-0 text-muted', hero ? 'ms-3 size-5' : 'ms-2.5 size-4')} />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={hasOptions}
          aria-controls={hasOptions ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-label={t('search.label')}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          placeholder={hero ? t('search.placeholder') : t('search.placeholderShort')}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            ensureEngine();
            setRecents(recentSearches.list());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden',
            hero ? 'min-h-12 px-3 text-base' : 'min-h-10 px-2 text-sm',
          )}
        />
        {hero && (
          <button type="submit" className="min-h-12 shrink-0 rounded-md bg-ocean px-5 text-sm font-semibold text-white transition-colors hover:bg-ocean-dark">
            {t('search.submit')}
          </button>
        )}
      </div>

      <div
        hidden={!showPopup}
        className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-line bg-surface text-start shadow-menu"
      >
        {!trimmed && options.length > 0 && (
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">{t('search.recent')}</span>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs font-medium text-link hover:bg-info-soft"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                recentSearches.clear();
                setRecents([]);
                notify(t('search.recentCleared'));
              }}
            >
              {t('search.clearRecent')}
            </button>
          </div>
        )}

        {trimmed && engineState === 'loading' && <p className="px-4 py-3 text-sm text-muted">{t('search.loading')}</p>}
        {trimmed && engineState === 'error' && <p className="px-4 py-3 text-sm text-bad">{t('search.unavailable')}</p>}
        {trimmed && engineState === 'ready' && options.length === 1 && <p className="px-4 pt-3 pb-1 text-sm text-muted">{t('search.noSuggestions')}</p>}

        {hasOptions && (
        <div id={listId} role="listbox" aria-label={trimmed ? t('search.suggestions') : t('search.recent')}>
        {options.map((option, i) => {
          const selected = i === active;
          const base = cn('flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm', selected ? 'bg-info-soft' : 'hover:bg-soft');
          return (
            <div
              key={option.id}
              id={option.id}
              role="option"
              aria-selected={selected}
              className={base}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option)}
            >
              {option.kind === 'result' && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-heading">
                      <Highlight text={option.result.title} query={trimmed} terms={option.result.terms} />
                    </span>
                    <span className="block truncate text-xs text-muted">{option.result.subtitle}</span>
                  </span>
                  <span className="shrink-0 rounded bg-soft px-2 py-0.5 text-xs text-muted ring-1 ring-line ring-inset">
                    {ENTITY_LABELS[option.result.type].singular}
                  </span>
                </>
              )}
              {option.kind === 'recent' && (
                <>
                  <History aria-hidden="true" className="size-4 shrink-0 text-muted" />
                  <span className="truncate text-ink">{option.query}</span>
                </>
              )}
              {option.kind === 'all' && (
                <>
                  <Search aria-hidden="true" className="size-4 shrink-0 text-link" />
                  <span className="flex-1 truncate font-medium text-link">{t('search.seeAll', { query: trimmed })}</span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-link rtl:rotate-180" />
                </>
              )}
            </div>
          );
        })}
        </div>
        )}
      </div>
    </form>
  );
}
