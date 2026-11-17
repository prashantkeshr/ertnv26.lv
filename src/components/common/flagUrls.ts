/**
 * Country flag SVG URLs (flag-icons, MIT). Kept in its own module so the lookup table is
 * loaded once, on demand, instead of weighing down every page's main bundle. The image
 * files themselves are only fetched for flags that are actually shown.
 */
const urls = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', { query: '?url', import: 'default', eager: true });

const byCode = new Map<string, string>();
for (const [path, url] of Object.entries(urls)) {
  const code = /\/([a-z]{2})\.svg$/.exec(path)?.[1];
  // "xx" is the library's placeholder for an unknown country — never show it as if it were a real flag.
  if (code && code !== 'xx') byCode.set(code, url);
}

export function flagUrl(code: string): string | null {
  return byCode.get(code.toLowerCase()) ?? null;
}
