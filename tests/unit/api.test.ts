import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cached } from '@/services/api/cache';
import { ApiError, fetchJson } from '@/services/api/http';
import { normaliseRate } from '@/services/api/providers/frankfurter';
import { normaliseWorldBankPage } from '@/services/api/providers/worldbank';
import { z } from 'zod';

describe('World Bank normaliser', () => {
  const raw = [
    { page: 1, pages: 1, per_page: 3, total: 3, lastupdated: '2026-11-11' },
    [
      { indicator: { id: 'X', value: 'Exports' }, country: { id: 'IN', value: 'India' }, countryiso3code: 'IND', date: '2024', value: 100 },
      { indicator: { id: 'X', value: 'Exports' }, country: { id: 'IN', value: 'India' }, countryiso3code: 'IND', date: '2025', value: null },
      { indicator: { id: 'X', value: 'Exports' }, country: { id: '1W', value: 'World' }, countryiso3code: '', date: '2024', value: 5 },
    ],
  ];

  it('keeps real observations and drops missing ones without filling them', () => {
    const page = normaliseWorldBankPage(raw);
    expect(page.observations).toEqual([{ code: 'IND', areaName: 'India', year: 2024, value: 100 }]);
    expect(page.lastUpdated).toBe('2026-11-11');
    expect(page.indicatorName).toBe('Exports');
  });

  it('rejects a response in an unexpected shape', () => {
    expect(() => normaliseWorldBankPage({ message: 'error' })).toThrow();
  });
});

describe('Frankfurter normaliser', () => {
  const result = { data: { base: 'USD', date: '2026-11-16', rates: { INR: 93.93 } }, fetchedAt: '2026-11-17T00:00:00.000Z', stale: false };
  it('returns a provider-independent rate carrying the provider observation date', () => {
    expect(normaliseRate(result, 'INR')).toMatchObject({ base: 'USD', quote: 'INR', rate: 93.93, observedOn: '2026-11-16', stale: false });
  });
  it('returns null when the pair is not in the response', () => {
    expect(normaliseRate(result, 'XYZ')).toBeNull();
  });
});

describe('fetchJson failure handling', () => {
  const schema = z.object({ ok: z.boolean() });
  afterEach(() => vi.unstubAllGlobals());

  const respond = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status, headers })));

  it('returns validated data', async () => {
    respond(200, { ok: true });
    await expect(fetchJson('https://x.test', { providerId: 'p', schema })).resolves.toEqual({ ok: true });
  });
  it('maps rate limiting with the retry hint', async () => {
    respond(429, {}, { 'Retry-After': '30' });
    await expect(fetchJson('https://x.test', { providerId: 'p', schema })).rejects.toMatchObject({ kind: 'rate-limited', retryAfter: 30 });
  });
  it('maps 404 and other HTTP errors', async () => {
    respond(404);
    await expect(fetchJson('https://x.test', { providerId: 'p', schema })).rejects.toMatchObject({ kind: 'not-found' });
    respond(500);
    await expect(fetchJson('https://x.test', { providerId: 'p', schema })).rejects.toMatchObject({ kind: 'http' });
  });
  it('rejects a response that fails validation instead of showing it', async () => {
    respond(200, { ok: 'yes' });
    await expect(fetchJson('https://x.test', { providerId: 'p', schema })).rejects.toMatchObject({ kind: 'invalid-response' });
  });
  it('maps network failure and timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(fetchJson('https://x.test', { providerId: 'p', schema })).rejects.toMatchObject({ kind: 'network' });
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new DOMException('t', 'TimeoutError'))));
    await expect(fetchJson('https://x.test', { providerId: 'p', schema })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('API cache with honest staleness', () => {
  beforeEach(() => window.localStorage.clear());

  it('serves a fresh entry without calling the loader again', async () => {
    const loader = vi.fn(async () => 'v1');
    await cached('k', 1000, loader, 0);
    const second = await cached('k', 1000, loader, 500);
    expect(second).toMatchObject({ data: 'v1', stale: false });
    expect(loader).toHaveBeenCalledTimes(1);
  });
  it('refetches after expiry', async () => {
    const loader = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    await cached('k', 1000, loader, 0);
    expect(await cached('k', 1000, loader, 5000)).toMatchObject({ data: 'v2', stale: false });
  });
  it('returns the old value flagged stale when a refresh fails', async () => {
    await cached('k', 1000, async () => 'v1', 0);
    const result = await cached('k', 1000, async () => Promise.reject(new Error('down')), 5000);
    expect(result).toMatchObject({ data: 'v1', stale: true });
  });
  it('throws when nothing is cached and the load fails', async () => {
    await expect(cached('empty', 1000, async () => Promise.reject(new Error('down')))).rejects.toThrow('down');
  });
});
