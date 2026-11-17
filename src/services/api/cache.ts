/**
 * Browser cache for live API responses, with honest staleness.
 *
 * - Fresh entry  → returned without a network request.
 * - Expired      → refetched; the new value replaces it.
 * - Refetch fails but an old entry exists → the old value is returned flagged `stale`,
 *   so the interface can label it instead of hiding the failure.
 *
 * Small payloads only (localStorage). Large provider payloads will use IndexedDB.
 */
const PREFIX = 'eport:api:';

export interface Cached<T> {
  data: T;
  /** When eport fetched this value from the provider (ISO timestamp). */
  fetchedAt: string;
  /** True when the value is past its lifetime and a refresh failed. */
  stale: boolean;
}

interface Entry<T> {
  data: T;
  fetchedAt: string;
}

function readEntry<T>(key: string): Entry<T> | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    return typeof entry?.fetchedAt === 'string' ? entry : null;
  } catch {
    return null;
  }
}

function writeEntry<T>(key: string, entry: Entry<T>): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    /* storage full or unavailable — the app still works, just without caching */
  }
}

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>, now = Date.now()): Promise<Cached<T>> {
  const entry = readEntry<T>(key);
  if (entry && now - Date.parse(entry.fetchedAt) < ttlMs) return { ...entry, stale: false };
  try {
    const data = await loader();
    const fresh = { data, fetchedAt: new Date(now).toISOString() };
    writeEntry(key, fresh);
    return { ...fresh, stale: false };
  } catch (error) {
    if (entry) return { ...entry, stale: true };
    throw error;
  }
}
