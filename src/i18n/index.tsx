/**
 * Internationalisation foundation.
 *
 * English ships at launch. A locale is added by (1) dropping a JSON file in ./locales,
 * (2) registering it in LOCALES with its text direction. Missing keys fall back to English,
 * and official identifiers (HS codes, ISO codes, legal document names) are never translated.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { prefs } from '@/services/storage/preferences';
import en from './locales/en.json';

export type MessageKey = keyof typeof en;
type Messages = Partial<Record<MessageKey, string>>;

interface LocaleDefinition {
  label: string;
  dir: 'ltr' | 'rtl';
  load: () => Promise<Messages>;
}

/** Launch locale. Planned next: hi, ar (rtl), fr, es, de, zh, ja — see ARCHITECTURE.md. */
export const LOCALES: Record<string, LocaleDefinition> = {
  en: { label: 'English', dir: 'ltr', load: async () => en },
};
export const DEFAULT_LOCALE = 'en';

export function translate(messages: Messages, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = messages[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

interface I18nValue {
  locale: string;
  dir: 'ltr' | 'rtl';
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  dir: 'ltr',
  t: (key, vars) => translate(en, key, vars),
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(() => {
    const saved = prefs.get('locale', DEFAULT_LOCALE);
    return saved in LOCALES ? saved : DEFAULT_LOCALE;
  });
  const [messages, setMessages] = useState<Messages>(en);
  const definition = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE]!;

  useEffect(() => {
    let active = true;
    definition.load().then((m) => active && setMessages(m));
    document.documentElement.lang = locale;
    document.documentElement.dir = definition.dir;
    return () => {
      active = false;
    };
  }, [locale, definition]);

  const setLocale = useCallback((next: string) => {
    if (!(next in LOCALES)) return;
    prefs.set('locale', next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, dir: definition.dir, t: (key, vars) => translate(messages, key, vars), setLocale }),
    [locale, definition.dir, messages, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
